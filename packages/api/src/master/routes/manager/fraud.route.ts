import { Request, Response, Router } from 'express';
import {
  FRAUD_DETECTION_CODES,
  FRAUD_DETECTION_ERRORS,
  FraudDetection,
  HttpStatus,
  paginationSchema,
  RiskLevel,
  TENANT_CODES,
  TENANT_ERRORS,
  TenantValidationUtils,
} from '@toke/shared';

import FraudDetectionLog from '../../class/FraudDetectionLog.js';
import ActivityMonitoring from '../../class/ActivityMonitoring.js';
import R from '../../../tools/response.js';
import Ensure from '../../../middle/ensured-routes.js';
import Tenant from '../../class/Tenant.js';
import EmployeeLicense from '../../class/EmployeeLicense.js';

const router = Router();

// ⚠️ Get list of active fraud detection alerts requiring manager investigation and action
router.get('/active-alerts', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant, risk_level, detection_type, resolved } = req.query;
    const paginationOptions = paginationSchema.parse(req.query);

    // Construire les filtres
    const filters: any = {};
    if (risk_level && Object.values(RiskLevel).includes(risk_level as RiskLevel)) {
      filters.risk_level = risk_level as RiskLevel;
    }
    if (
      detection_type &&
      Object.values(FraudDetection).includes(detection_type as FraudDetection)
    ) {
      filters.detection_type = detection_type as FraudDetection;
    }
    if (resolved !== undefined) {
      filters.resolved = resolved === 'true';
    }

    let alertsData;

    if (tenant) {
      if (!TenantValidationUtils.validateTenantGuid(tenant as string)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TENANT_CODES.INVALID_GUID,
          message: TENANT_ERRORS.GUID_INVALID,
        });
      }
      const tenantGuid = parseInt(tenant as string, 10);
      const tenantObj = await Tenant._load(tenantGuid, true);
      if (!tenantObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TENANT_CODES.TENANT_NOT_FOUND,
          message: TENANT_ERRORS.NOT_FOUND,
        });
      }
      alertsData = await FraudDetectionLog.exportable(
        tenantObj.getId()!,
        filters,
        paginationOptions,
      );
    } else {
      alertsData = await FraudDetectionLog.exportable(undefined, filters, paginationOptions);
    }

    return R.handleSuccess(res, { alertsData });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération alertes actives:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to retrieve active alerts',
      details: error.message,
    });
  }
});

// 🔍 Analyze suspicious patterns for specific employee with risk scoring and history
router.get('/patterns/:reference', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'reference_required',
        message: 'Reference is required',
      });
    }
    const paginationOptions = paginationSchema.parse(req.query);

    // Récupérer les alertes concernant cet employé
    const employeeAlerts = await FraudDetectionLog._listByEmployee(reference);
    if (!employeeAlerts || employeeAlerts.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: 'No fraud alerts found for this employee',
      });
    }

    const employeeObj = await EmployeeLicense._loadByEmployee(reference);
    let activityPatterns;
    let activityHistory;
    if (employeeObj) {
      // Récupérer l'historique d'activité de l'employé
      activityHistory = await ActivityMonitoring._listByEmployeeLicense(
        employeeObj.getId()!,
        { limit: 30 }, // Derniers 30 enregistrements
      );

      // Analyser les patterns d'activité
      activityPatterns =
        activityHistory?.map(
          async (activity) => await activity.toJSON(),
          //     ({
          //     date: activity.getMonitoringDate(),
          //     status: activity.getStatusAtDate(),
          //     punch_count_7_days: activity.getPunchCount7Days(),
          //     consecutive_absent_days: activity.getConsecutiveAbsentDays(),
          //     activity_score: activity.getActivityScore(),
          //     risk_level: activity.getRiskLevel(),
          // })
        ) || [];
    }

    // Calculer les scores de risque
    const alertsByType = employeeAlerts.reduce(
      (acc, alert) => {
        const type = alert.getDetectionType();
        if (type) {
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const riskScore =
      employeeAlerts.reduce((total, alert) => {
        return total + alert.getSeverityScore();
      }, 0) / employeeAlerts.length;

    const alertsData = await Promise.all(employeeAlerts.map(async (alert) => await alert.toJSON()));

    return R.handleSuccess(res, {
      employee: reference,
      risk_analysis: {
        overall_risk_score: Math.round(riskScore),
        total_alerts: employeeAlerts.length,
        unresolved_alerts: employeeAlerts.filter((a) => !a.isResolved()).length,
        alerts_by_type: alertsByType,
        requires_urgent_attention: employeeAlerts.some((a) => a.requiresUrgentAttention()),
        last_alert_date: employeeAlerts[0]?.getCreatedAt(),
      },
      fraud_alerts: alertsData,
      activity_patterns: activityPatterns,
      recommendations: generateEmployeeRecommendations(employeeAlerts, activityHistory!),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur analyse patterns employé:', error);
    console.error('Stack trace:', error.stack);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'pattern_analysis_failed',
      message: 'Failed to analyze employee patterns',
      // details: {
      //   message: error.message,
      //   name: error.name,
      //   stack: error.stack
      // },
    });
  }
});

// 🕵️ Mark fraud alert as under investigation and track resolution progress
router.put('/alerts/:guid/investigate', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const { notes, investigator } = req.body;

    if (!guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_guid',
        message: 'Invalid alert GUID',
      });
    }

    const alert = await FraudDetectionLog._load(guid, true);
    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    if (alert.isResolved()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'alert_already_resolved',
        message: 'Cannot investigate an already resolved alert',
      });
    }

    // Marquer comme en cours d'investigation
    let investigationNotes = `Investigation started`;
    if (investigator) {
      investigationNotes += ` by user ${investigator}`;
    }
    if (notes) {
      investigationNotes += ` - ${notes}`;
    }
    investigationNotes += ` at ${new Date().toISOString()}`;

    const currentNotes = alert.getNotes() || '';
    const updatedNotes = currentNotes
      ? `${currentNotes}\n\n${investigationNotes}`
      : investigationNotes;

    const success = await alert.updateNotesForThis(updatedNotes);

    if (!success) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'investigation_update_failed',
        message: 'Failed to update investigation status',
      });
    }

    return R.handleSuccess(res, {
      message: 'Alert marked as under investigation',
      alert: await alert.toJSON(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur marquage investigation:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'investigation_failed',
      message: 'Failed to mark alert as under investigation',
      details: error.message,
    });
  }
});

// 🎯 Close fraud alert with resolution details and corrective actions taken
router.put('/alerts/:guid/resolve', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const { resolved_by, action_taken, resolution_notes } = req.body;

    if (!guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_guid',
        message: 'Invalid alert GUID',
      });
    }

    if (!resolved_by) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'resolved_by_required',
        message: 'Resolved_by is required to resolve an alert',
      });
    }

    const alert = await FraudDetectionLog._load(guid, true);
    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    if (alert.isResolved()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'alert_already_resolved',
        message: 'Alert is already resolved',
      });
    }

    // Construire les notes de résolution
    let resolutionText = action_taken || 'Alert resolved';
    if (resolution_notes) {
      resolutionText += ` - ${resolution_notes}`;
    }

    // Résoudre l'alerte
    const success = await alert.resolveThis(parseInt(resolved_by), resolutionText);

    if (!success) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'resolution_failed',
        message: 'Failed to resolve alert',
      });
    }

    return R.handleSuccess(res, {
      message: 'Alert resolved successfully',
      alert: await alert.toJSON(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur résolution alerte:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'resolution_failed',
      message: 'Failed to resolve alert',
      details: error.message,
    });
  }
});

// 🕐 Detect and list employees with late arrivals today requiring attention
router.get('/alerts/late-arrivals', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // const { tenant } = req.query;
    const paginationOptions = paginationSchema.parse(req.query);
    const today = new Date();

    // let tenantId: number | undefined;
    // if (tenant) {
    //     if (!TenantValidationUtils.validateTenantGuid(tenant as string)) {
    //         return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //             code: TENANT_CODES.INVALID_GUID,
    //             message: TENANT_ERRORS.GUID_INVALID,
    //         });
    //     }
    //     tenantId = parseInt(tenant as string, 10);
    // }

    // Récupérer les employés avec une activité suspecte ou faible aujourd'hui
    const suspiciousEmployees =
      await ActivityMonitoring._listSuspiciousEmployees(paginationOptions);
    const lowActivityEmployees = await ActivityMonitoring._listLowActivity(1, paginationOptions);

    // Combiner et filtrer pour les arrivées tardives (logique à adapter selon votre business)
    const lateArrivals = [...(suspiciousEmployees || []), ...(lowActivityEmployees || [])].filter(
      (activity) => {
        const monitoringDate = activity.getMonitoringDate();
        return (
          monitoringDate &&
          monitoringDate.toDateString() === today.toDateString() &&
          (activity.getPunchCount7Days() || 0) < 2
        ); // Moins de 2 pointages = retard potentiel
      },
    );

    const lateArrivalsData = await Promise.all(
      lateArrivals.map(async (activity) => ({
        ...(await activity.toJSON()),
        alert_type: 'LATE_ARRIVAL',
        priority: activity.getAttentionPriority(),
        recommendations: activity.getActionRecommendations(),
      })),
    );

    return R.handleSuccess(res, {
      date: today.toISOString().split('T')[0],
      late_arrivals: lateArrivalsData,
      count: lateArrivalsData.length,
      high_priority_count: lateArrivalsData.filter((la) => la.priority <= 2).length,
    });
  } catch (error: any) {
    console.error('⚠️ Erreur détection retards:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'late_arrivals_failed',
      message: 'Failed to detect late arrivals',
      details: error.message,
    });
  }
});

// ⚠️ Identify unclosed work sessions where employees forgot to check out
router.get('/alerts/missing-clockouts', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    // Rechercher les employés avec des sessions non fermées (activité récente mais statut suspect)
    const suspiciousActivities =
      await ActivityMonitoring._listSuspiciousEmployees(paginationOptions);

    if (!suspiciousActivities || suspiciousActivities.length === 0) {
      return R.handleSuccess(res, {
        missing_clockouts: [],
        count: 0,
      });
    }

    // Filtrer pour les sessions potentiellement non fermées
    const missingClockouts = suspiciousActivities.filter((activity) => {
      const lastPunchDate = activity.getLastPunchDate();
      const consecutiveAbsent = activity.getConsecutiveAbsentDays() || 0;

      // Logique: pointage récent (< 2 jours) mais absence consécutive > 0
      return (
        lastPunchDate &&
        consecutiveAbsent > 0 &&
        consecutiveAbsent < 3 && // Pas trop ancien
        new Date().getTime() - lastPunchDate.getTime() < 2 * 24 * 60 * 60 * 1000
      ); // < 2 jours
    });

    const missingClockoutsData = await Promise.all(
      missingClockouts.map(async (activity) => ({
        ...(await activity.toJSON()),
        alert_type: 'MISSING_CLOCKOUT',
        estimated_session_duration: calculateSessionDuration(activity.getLastPunchDate()),
        recommendations: [
          'Verify last clockout',
          'Contact employee',
          'Manual session closure may be needed',
        ],
      })),
    );

    return R.handleSuccess(res, {
      missing_clockouts: missingClockoutsData,
      count: missingClockoutsData.length,
      urgency_level:
        missingClockoutsData.length > 10
          ? RiskLevel.HIGH
          : missingClockoutsData.length > 5
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW,
    });
  } catch (error: any) {
    console.error('⚠️ Erreur détection sessions non fermées:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'missing_clockouts_failed',
      message: 'Failed to identify missing clockouts',
      details: error.message,
    });
  }
});

// ⏳ Alert for memos approaching or exceeding 24-hour validation deadline
router.get('/alerts/memo-deadlines', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // Cette fonctionnalité nécessiterait une classe Memo qui n'est pas encore implementer
    // Implémentation simulée basée sur les patterns d'activité

    const longAbsentEmployees = await ActivityMonitoring._listLongAbsent(1, { limit: 50 });

    if (!longAbsentEmployees) {
      return R.handleSuccess(res, {
        memo_deadlines: [],
        count: 0,
      });
    }

    // Simuler des mémos en attente basés sur les absences
    const memoDeadlines = longAbsentEmployees
      .filter((activity) => (activity.getConsecutiveAbsentDays() || 0) >= 1)
      .map((activity) => ({
        employee_license: activity.getEmployeeLicense(),
        memo_type: 'ABSENCE_JUSTIFICATION',
        days_absent: activity.getConsecutiveAbsentDays(),
        deadline_status: (activity.getConsecutiveAbsentDays() || 0) > 1 ? 'OVERDUE' : 'APPROACHING',
        hours_remaining: Math.max(0, 24 - (activity.getConsecutiveAbsentDays() || 0) * 24),
        priority: (activity.getConsecutiveAbsentDays() || 0) > 2 ? 'CRITICAL' : 'HIGH',
      }));

    return R.handleSuccess(res, {
      memo_deadlines: memoDeadlines,
      count: memoDeadlines.length,
      overdue_count: memoDeadlines.filter((m) => m.deadline_status === 'OVERDUE').length,
      critical_count: memoDeadlines.filter((m) => m.priority === 'CRITICAL').length,
    });
  } catch (error: any) {
    console.error('⚠️ Erreur alertes mémos:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'memo_deadlines_failed',
      message: 'Failed to retrieve memo deadlines',
      details: error.message,
    });
  }
});

// 📢 Get important system notifications including updates, maintenance, and announcements
router.get('/alerts/system-notifications', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // Récupérer les alertes système critiques non résolues
    const criticalAlerts = await FraudDetectionLog._listCriticalUnresolved(undefined, {
      limit: 10,
    });
    const systemSummary = await FraudDetectionLog._getAlertSummary(1); // Système global

    // Générer des notifications système
    const notifications = [];

    // Notification pour alertes critiques
    if (criticalAlerts && criticalAlerts.length > 0) {
      notifications.push({
        id: 'critical-fraud-alerts',
        type: 'CRITICAL_ALERT',
        title: `${criticalAlerts.length} Critical Fraud Alert${criticalAlerts.length > 1 ? 's' : ''} Require Attention`,
        message: 'Immediate investigation required for critical fraud detection alerts',
        priority: RiskLevel.CRITICAL,
        created_at: new Date().toISOString(),
        action_required: true,
        action_url: '/fraud-monitoring/active-alerts?risk_level=CRITICAL',
      });
    }

    // Notification pour tendances globales
    if (systemSummary.unresolved > 20) {
      notifications.push({
        id: 'high-unresolved-alerts',
        type: 'WARNING',
        title: 'High Number of Unresolved Alerts',
        message: `${systemSummary.unresolved} fraud alerts are currently unresolved`,
        priority: RiskLevel.HIGH,
        created_at: new Date().toISOString(),
        action_required: true,
        action_url: '/fraud-monitoring/active-alerts?resolved=false',
      });
    }

    // Notification de maintenance (simulée)
    notifications.push({
      id: 'system-health',
      type: 'INFO',
      title: 'Fraud Detection System Status',
      message: 'All fraud detection triggers are operational',
      priority: RiskLevel.LOW,
      created_at: new Date().toISOString(),
      action_required: false,
    });

    return R.handleSuccess(res, {
      notifications,
      system_health: {
        fraud_detection_active: true,
        activity_monitoring_active: true,
        last_check: new Date().toISOString(),
        total_alerts: systemSummary.total,
        unresolved_alerts: systemSummary.unresolved,
      },
    });
  } catch (error: any) {
    console.error('⚠️ Erreur notifications système:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'system_notifications_failed',
      message: 'Failed to retrieve system notifications',
      details: error.message,
    });
  }
});

// 🔧 Retrieve current alert configuration and notification preferences for manager
router.get('/alerts/settings', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // Configuration simulée - dans une vraie application, cela viendrait d'une table de configuration
    const alertSettings = {
      fraud_alerts: {
        enabled: true,
        risk_levels: {
          critical: { enabled: true, immediate_notification: true },
          high: { enabled: true, immediate_notification: true },
          medium: { enabled: true, immediate_notification: false },
          low: { enabled: false, immediate_notification: false },
        },
        detection_types: {
          suspicious_leave_pattern: { enabled: true, threshold_percentage: 15 },
          mass_deactivation: { enabled: true, threshold_count: 20 },
          pre_renewal_manipulation: { enabled: true, threshold_days: 30 },
          excessive_technical_leave: { enabled: true, threshold_percentage: 10 },
          unusual_activity: { enabled: true },
        },
      },
      activity_monitoring: {
        enabled: true,
        late_arrivals: { enabled: true, threshold_hours: 2 },
        missing_clockouts: { enabled: true, threshold_hours: 24 },
        suspicious_patterns: { enabled: true, consecutive_days_threshold: 3 },
      },
      notification_preferences: {
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
        daily_summary: true,
        weekly_report: true,
      },
      escalation_rules: {
        critical_alerts_auto_escalate_hours: 2,
        unresolved_alerts_escalate_days: 7,
        manager_notification_enabled: true,
      },
    };

    return R.handleSuccess(res, {
      alert_settings: alertSettings,
      last_updated: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération paramètres:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'settings_retrieval_failed',
      message: 'Failed to retrieve alert settings',
      details: error.message,
    });
  }
});

// ⚙️ Configure which alerts to receive and notification delivery preferences
router.put('/alerts/settings', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { alert_settings } = req.body;

    if (!alert_settings) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'settings_required',
        message: 'alert_settings is required',
      });
    }

    // Validation des paramètres (simplifié)
    const validatedSettings = validateAlertSettings(alert_settings);

    if (!validatedSettings.valid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_settings',
        message: 'Invalid alert settings',
        details: validatedSettings.errors,
      });
    }

    // Dans une vraie application, sauvegarder en base de données
    // await AlertSettings.save(userId, alert_settings);

    console.log("✅ Paramètres d'alerte mis à jour:", alert_settings);

    return R.handleSuccess(res, {
      message: 'Alert settings updated successfully',
      updated_settings: alert_settings,
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur mise à jour paramètres:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'settings_update_failed',
      message: 'Failed to update alert settings',
      details: error.message,
    });
  }
});

// 📱 Send test notification to verify delivery settings and troubleshoot issues
router.post('/alerts/test-notification', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { notification_type, recipient } = req.body;

    if (!notification_type) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'notification_type_required',
        message: 'notification_type is required (email, sms, push)',
      });
    }

    const testMessage = {
      title: 'Test Notification - TOKE Fraud Monitoring',
      message:
        'This is a test notification to verify your alert delivery settings are working correctly.',
      timestamp: new Date().toISOString(),
      type: notification_type,
    };

    // Simuler l'envoi de notification
    let deliveryResult;
    switch (notification_type.toLowerCase()) {
      case 'email':
        deliveryResult = await sendTestEmail(recipient || 'default@example.com', testMessage);
        break;
      case 'sms':
        deliveryResult = await sendTestSMS(recipient || '+1234567890', testMessage);
        break;
      case 'push':
        deliveryResult = await sendTestPush(recipient || 'default_device', testMessage);
        break;
      default:
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_notification_type',
          message: 'Invalid notification type. Use: email, sms, or push',
        });
    }

    return R.handleSuccess(res, {
      message: 'Test notification sent successfully',
      delivery_result: deliveryResult,
      test_details: {
        notification_type,
        recipient: recipient || 'default',
        sent_at: new Date().toISOString(),
        message_content: testMessage,
      },
    });
  } catch (error: any) {
    console.error('⚠️ Erreur envoi notification test:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'test_notification_failed',
      message: 'Failed to send test notification',
      details: error.message,
    });
  }
});

// Helper functions
function generateEmployeeRecommendations(alerts: any[], activityHistory: any[]): string[] {
  const recommendations = [];

  if (alerts.some((a) => !a.isResolved())) {
    recommendations.push('Review and resolve pending fraud alerts');
  }

  if (alerts.some((a) => a.isCritical())) {
    recommendations.push('Immediate investigation required for critical alerts');
  }

  if (activityHistory && activityHistory.some((a) => a.isSuspicious())) {
    recommendations.push('Monitor employee activity patterns closely');
  }

  if (alerts.length > 3) {
    recommendations.push('Consider enhanced monitoring or training for this employee');
  }

  if (recommendations.length === 0) {
    recommendations.push('No specific action required at this time');
  }

  return recommendations;
}

function calculateSessionDuration(lastPunchDate: Date | undefined): string {
  if (!lastPunchDate) return 'Unknown';

  const now = new Date();
  const diffMs = now.getTime() - lastPunchDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function validateAlertSettings(settings: any): { valid: boolean; errors: string[] } {
  const errors = [];

  // Validation basique
  if (!settings.fraud_alerts) {
    errors.push('fraud_alerts configuration is required');
  }

  if (!settings.activity_monitoring) {
    errors.push('activity_monitoring configuration is required');
  }

  if (!settings.notification_preferences) {
    errors.push('notification_preferences configuration is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Mock functions for notification testing
async function sendTestEmail(recipient: string, message: any): Promise<any> {
  console.log(`📧 Test email sent to: ${recipient}`);
  return {
    success: true,
    provider: 'email',
    recipient,
    message_id: `email_${Date.now()}`,
  };
}

async function sendTestSMS(recipient: string, message: any): Promise<any> {
  console.log(`📱 Test SMS sent to: ${recipient}`);
  return {
    success: true,
    provider: 'sms',
    recipient,
    message_id: `sms_${Date.now()}`,
  };
}

async function sendTestPush(recipient: string, message: any): Promise<any> {
  console.log(`🔔 Test push notification sent to: ${recipient}`);
  return {
    success: true,
    provider: 'push',
    recipient,
    message_id: `push_${Date.now()}`,
  };
}

export default router;
