import { HttpStatus } from '@toke/shared';

import { responseStructure } from '../utils/response.model.js';

import WapService from './send.otp.service.js';
import EmailSender from './send.email.service.js';
import InvitationService from './spondor.service.js';

type OtpDeliveryStatus = 'sent' | 'partial_failure' | 'failed';

interface EmployeeOtpDeliveryData {
  otp: string;
  phoneNumber: string;
  country: string;
  email?: string | null;
}

interface DeliveryChannelResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  reason?: string;
}

export interface EmployeeOtpDeliveryResult {
  status: OtpDeliveryStatus;
  all_sent: boolean;
  sent_channels: string[];
  failed_channels: string[];
  warning: string | null;

  whatsapp: DeliveryChannelResult;
  email: DeliveryChannelResult;
}

export default class OtpDeliveryService {
  static async sendEmployeeOtp(data: EmployeeOtpDeliveryData): Promise<EmployeeOtpDeliveryResult> {
    const { otp, phoneNumber, country, email } = data;

    const [android, ios] = await Promise.all([
      InvitationService.findEmployeeLink(responseStructure.EMPLOYEE_ANDROID_APP),
      InvitationService.findEmployeeLink(responseStructure.EMPLOYEE_IOS_APP),
    ]);

    const buttons = {
      android_link: (android as any).response.link,
      ios_link: (ios as any).response.link,
    };

    const [whatsapp, emailDelivery] = await Promise.all([
      this.sendWhatsApp(otp, phoneNumber, country, buttons),

      email
        ? this.sendEmail(otp, email)
        : Promise.resolve<DeliveryChannelResult>({
            sent: false,
            skipped: true,
            reason: 'Employee has no email address',
          }),
    ]);

    return this.buildDeliveryResult(whatsapp, emailDelivery, Boolean(email));
  }

  private static buildDeliveryResult(
    whatsapp: DeliveryChannelResult,
    email: DeliveryChannelResult,
    emailExpected: boolean,
  ): EmployeeOtpDeliveryResult {
    const sentChannels: string[] = [];
    const failedChannels: string[] = [];

    if (whatsapp.sent) {
      sentChannels.push('whatsapp');
    } else {
      failedChannels.push('whatsapp');
    }

    /*
     * Une adresse absente signifie que l’email est ignoré,
     * et non que l’envoi a échoué.
     */
    if (emailExpected) {
      if (email.sent) {
        sentChannels.push('email');
      } else {
        failedChannels.push('email');
      }
    }

    let status: OtpDeliveryStatus;

    if (failedChannels.length === 0) {
      status = 'sent';
    } else if (sentChannels.length > 0) {
      status = 'partial_failure';
    } else {
      status = 'failed';
    }

    return {
      status,
      all_sent: failedChannels.length === 0,
      sent_channels: sentChannels,
      failed_channels: failedChannels,

      warning:
        failedChannels.length > 0 ? `OTP delivery failed for: ${failedChannels.join(', ')}` : null,

      whatsapp,
      email,
    };
  }

  private static async sendWhatsApp(
    otp: string,
    phoneNumber: string,
    country: string,
    buttons: {
      android_link: string;
      ios_link: string;
    },
  ): Promise<DeliveryChannelResult> {
    try {
      const result: any = await WapService.sendInvitation(otp, phoneNumber, country, buttons);

      if (!result || result.status !== HttpStatus.SUCCESS) {
        return {
          sent: false,
          error: result?.response?.message ?? 'WhatsApp OTP delivery failed',
        };
      }

      return {
        sent: true,
      };
    } catch (error: unknown) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'WhatsApp OTP delivery failed',
      };
    }
  }

  private static async sendEmail(otp: string, email: string): Promise<DeliveryChannelResult> {
    try {
      await EmailSender.sender(otp, email);

      return {
        sent: true,
      };
    } catch (error: unknown) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Email OTP delivery failed',
      };
    }
  }
}
