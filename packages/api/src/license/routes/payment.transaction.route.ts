import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  PAYMENT_TRANSACTION_CODES,
  PAYMENT_TRANSACTION_ERRORS,
  PaymentTransactionStatus,
  PT
} from '@toke/shared';

import PaymentTransaction from '../class/PaymentTransaction.js';
import R from '../../tools/response.js';
import G from '../../tools/glossary.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET / - Exporter toutes les transactions de paiement
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const paymentTransactions = await PaymentTransaction.exportable(paginationOptions);
    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur export transactions de paiement:', error);
    if (error.issues) { // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.EXPORT_FAILED,
        message: PAYMENT_TRANSACTION_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.PAYMENT_TRANSACTION);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /status/:status - Lister les transactions par statut
 */
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const transactionStatus = status.toUpperCase() as PaymentTransactionStatus;

    if (!Object.values(PaymentTransactionStatus).includes(transactionStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: `Invalid transaction status: ${status}`,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByStatus(transactionStatus, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      transaction_status: transactionStatus,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par statut de transaction:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: `Failed to search transactions by status: ${req.params.status}`,
      });
    }
  }
});

/**
 * GET /payment-method/:payment_method - Lister les transactions par méthode de paiement
 */
router.get('/payment-method/:payment_method', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paymentMethod = parseInt(req.params.payment_method);
    if (isNaN(paymentMethod)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'Payment method ID must be a number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByPaymentMethod(paymentMethod, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      payment_method: paymentMethod,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par méthode de paiement:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: `Failed to search transactions by payment method: ${req.params.payment_method}`,
      });
    }
  }
});

/**
 * GET /billing-cycle/:billing_cycle - Lister les transactions par cycle de facturation
 */
router.get('/billing-cycle/:billing_cycle', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const billingCycle = parseInt(req.params.billing_cycle);
    if (isNaN(billingCycle)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'Billing cycle ID must be a number',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByBillingCycle(billingCycle, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      billing_cycle: billingCycle,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par cycle de facturation:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: `Failed to search transactions by billing cycle: ${req.params.billing_cycle}`,
      });
    }
  }
});

/**
 * GET /currency/:currency - Lister les transactions par devise
 */
router.get('/currency/:currency', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    const validCurrency = currency.toUpperCase();

    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByCurrency(validCurrency, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      currency_code: validCurrency,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par devise:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: `Failed to search transactions by currency: ${req.params.currency}`,
      });
    }
  }
});

/**
 * GET /amount-range - Lister les transactions par plage de montant
 */
router.get('/amount-range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { min_amount, max_amount, currency } = req.query;

    if (!min_amount || !max_amount) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'min_amount and max_amount are required',
      });
    }

    const minAmount = parseFloat(min_amount as string);
    const maxAmount = parseFloat(max_amount as string);

    if (isNaN(minAmount) || isNaN(maxAmount) || minAmount < 0 || maxAmount < 0 || minAmount > maxAmount) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'Invalid amount range',
      });
    }

    const currencyType = (currency as string)?.toLowerCase() === 'local' ? 'local' : 'usd';
    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByAmountRange(minAmount, maxAmount, currencyType, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      amount_range: {
        min: minAmount,
        max: maxAmount,
        currency: currencyType
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par plage de montant:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: 'Failed to search transactions by amount range',
      });
    }
  }
});

/**
 * GET /date-range - Lister les transactions par plage de dates
 */
router.get('/date-range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, date_field } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'Invalid date format',
      });
    }

    const dateFieldType = ['initiated_at', 'completed_at', 'failed_at'].includes(date_field as string)
      ? date_field as 'initiated_at' | 'completed_at' | 'failed_at'
      : 'initiated_at';

    const paginationOptions = paginationSchema.parse(req.query);

    const transactionsData = await PaymentTransaction._listByDateRange(startDate, endDate, dateFieldType, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        field: dateFieldType
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche par plage de dates:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: 'Failed to search transactions by date range',
      });
    }
  }
});

/**
 * GET /search - Recherche avancée de transactions
 */
router.get('/search', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const {
      status,
      payment_method,
      currency_code,
      min_amount,
      max_amount,
      start_date,
      end_date,
      payment_reference
    } = req.query;

    const criteria: any = {};

    if (status) {
      const transactionStatus = (status as string).toUpperCase() as PaymentTransactionStatus;
      if (Object.values(PaymentTransactionStatus).includes(transactionStatus)) {
        criteria.status = transactionStatus;
      }
    }

    if (payment_method) {
      const paymentMethodId = parseInt(payment_method as string);
      if (!isNaN(paymentMethodId)) {
        criteria.payment_method = paymentMethodId;
      }
    }

    if (currency_code) {
      criteria.currency_code = (currency_code as string).toUpperCase();
    }

    if (min_amount) {
      const minAmount = parseFloat(min_amount as string);
      if (!isNaN(minAmount)) {
        criteria.min_amount = minAmount;
      }
    }

    if (max_amount) {
      const maxAmount = parseFloat(max_amount as string);
      if (!isNaN(maxAmount)) {
        criteria.max_amount = maxAmount;
      }
    }

    if (start_date) {
      const startDate = new Date(start_date as string);
      if (!isNaN(startDate.getTime())) {
        criteria.start_date = startDate;
      }
    }

    if (end_date) {
      const endDate = new Date(end_date as string);
      if (!isNaN(endDate.getTime())) {
        criteria.end_date = endDate;
      }
    }

    if (payment_reference) {
      criteria.payment_reference = payment_reference as string;
    }

    const transactionsData = await PaymentTransaction.search(criteria, paginationOptions);
    if (!transactionsData) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const paymentTransactions = {
      search_criteria: criteria,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || transactionsData.length,
        count: transactionsData.length,
      },
      items: await Promise.all(transactionsData.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur recherche avancée transactions:', error);
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.PAGINATION_INVALID,
        message: PAYMENT_TRANSACTION_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
        message: 'Failed to perform advanced search',
      });
    }
  }
});

/**
 * GET /statistics - Obtenir les statistiques des transactions
 */
router.get('/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (start_date) {
      startDate = new Date(start_date as string);
      if (isNaN(startDate.getTime())) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
          message: 'Invalid start_date format',
        });
      }
    }

    if (end_date) {
      endDate = new Date(end_date as string);
      if (isNaN(endDate.getTime())) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
          message: 'Invalid end_date format',
        });
      }
    }

    const statistics = await PaymentTransaction.getStatistics(startDate, endDate);

    R.handleSuccess(res, {
      transaction_statistics: statistics,
      period: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString()
      }
    });
  } catch (error: any) {
    console.error('⚠️ Erreur récupération statistiques transactions:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
      message: 'Failed to get transaction statistics',
    });
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer une nouvelle transaction de paiement
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = PT.validatePaymentTransactionCreation(req.body);

    const transactionObj = PaymentTransaction.createNew({
      billing_cycle: validatedData.billing_cycle,
      adjustment: validatedData.adjustment,
      amount_usd: validatedData.amount_usd,
      amount_local: validatedData.amount_local,
      currency_code: validatedData.currency_code,
      exchange_rate_used: validatedData.exchange_rate_used,
      payment_method: validatedData.payment_method,
      payment_reference: validatedData.payment_reference,
    });

    if (validatedData.transaction_status) {
      transactionObj.setTransactionStatus(validatedData.transaction_status);
    }

    await transactionObj.save();

    console.log(`✅ Transaction de paiement créée: GUID ${transactionObj.getGuid()}, Référence: ${validatedData.payment_reference}`);
    return R.handleCreated(res, await transactionObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur création transaction de paiement:', error.message);

    if (error.issues) { // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: PAYMENT_TRANSACTION_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une transaction de paiement par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    // Charger par GUID
    const transactionObj = await PaymentTransaction._load(validGuid, true);
    if (!transactionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const validateData = PT.validatePaymentTransactionUpdate(req.body);

    // Mise à jour des champs fournis
    if (validateData.billing_cycle !== undefined) transactionObj.setBillingCycle(validateData.billing_cycle);
    if (validateData.adjustment !== undefined) transactionObj.setAdjustment(validateData.adjustment);
    if (validateData.amount_usd !== undefined) transactionObj.setAmountUsd(validateData.amount_usd);
    if (validateData.amount_local !== undefined) transactionObj.setAmountLocal(validateData.amount_local);
    if (validateData.currency_code !== undefined) transactionObj.setCurrencyCode(validateData.currency_code);
    if (validateData.exchange_rate_used !== undefined) transactionObj.setExchangeRate(validateData.exchange_rate_used);
    if (validateData.payment_method !== undefined) transactionObj.setPaymentMethod(validateData.payment_method);
    if (validateData.payment_reference !== undefined) transactionObj.setPaymentReference(validateData.payment_reference);
    if (validateData.transaction_status !== undefined) transactionObj.setTransactionStatus(validateData.transaction_status);
    if (validateData.failure_reason != null) transactionObj.setFailureReason(validateData.failure_reason);

    await transactionObj.save();

    console.log(`✅ Transaction de paiement modifiée: GUID ${validGuid}`);
    R.handleSuccess(res, await transactionObj.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur modification transaction de paiement:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_GUID,
        message: PAYMENT_TRANSACTION_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer une transaction de paiement par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    // Charger par GUID
    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    const deleted = await transaction.delete();

    if (deleted) {
      console.log(`✅ Transaction de paiement supprimée: GUID ${validGuid} (${transaction.getPaymentReference()})`);
      R.handleSuccess(res, {
        message: 'Payment transaction deleted successfully',
        guid: validGuid,
        payment_reference: transaction.getPaymentReference(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, G.savedError);
    }
  } catch (error: any) {
    console.error('⚠️ Erreur suppression transaction de paiement:', error);

    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_GUID,
        message: PAYMENT_TRANSACTION_ERRORS.GUID_INVALID,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  }
});

// endregion

// region ROUTES ACTIONS

/**
 * PATCH /:guid/start-processing - Démarrer le traitement de la transaction
 */
router.patch('/:guid/start-processing', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    if (!transaction.isPending()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_STATUS_TRANSITION,
        message: 'Only pending transactions can be started',
      });
    }

    await transaction.startProcessing();
    console.log(`✅ Traitement de transaction démarré: GUID ${validGuid}`);

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur démarrage traitement transaction:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/complete - Compléter la transaction avec succès
 */
router.patch('/:guid/complete', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    if (!transaction.isProcessing()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_STATUS_TRANSITION,
        message: 'Only processing transactions can be completed',
      });
    }

    await transaction.complete();
    console.log(`✅ Transaction complétée: GUID ${validGuid}`);

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur completion transaction:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/fail - Marquer la transaction comme échouée
 */
router.patch('/:guid/fail', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);
    const { failure_reason } = req.body;

    if (!failure_reason || typeof failure_reason !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: 'failure_reason is required',
      });
    }

    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    if (transaction.isFinal()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_STATUS_TRANSITION,
        message: 'Cannot fail a final transaction',
      });
    }

    await transaction.fail(failure_reason);
    console.log(`✅ Transaction marquée comme échouée: GUID ${validGuid}`);

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur échec transaction:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/cancel - Annuler la transaction
 */
router.patch('/:guid/cancel', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    if (transaction.isFinal()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_STATUS_TRANSITION,
        message: 'Cannot cancel a final transaction',
      });
    }

    await transaction.cancel();
    console.log(`✅ Transaction annulée: GUID ${validGuid}`);

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur annulation transaction:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/refund - Rembourser la transaction
 */
router.patch('/:guid/refund', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = PT.validatePaymentTransactionGuid(req.params.guid);

    const transaction = await PaymentTransaction._load(validGuid, true);
    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    if (!transaction.isCompleted()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.INVALID_STATUS_TRANSITION,
        message: 'Only completed transactions can be refunded',
      });
    }

    await transaction.refund();
    console.log(`✅ Transaction remboursée: GUID ${validGuid}`);

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur remboursement transaction:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister toutes les transactions de paiement (pour admin)
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = PT.validatePaymentTransactionFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.billing_cycle) conditions.billing_cycle = filters.billing_cycle;
    if (filters.adjustment) conditions.adjustment = filters.adjustment;
    if (filters.payment_method) conditions.payment_method = filters.payment_method;
    if (filters.currency_code) conditions.currency_code = filters.currency_code;
    if (filters.transaction_status) conditions.transaction_status = filters.transaction_status;
    if (filters.payment_reference) conditions.payment_reference = filters.payment_reference;

    const transactionEntries = await PaymentTransaction._list(conditions, paginationOptions);
    if (!transactionEntries) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
      });
    }

    // Appliquer les filtres supplémentaires si nécessaire
    let filteredTransactions = transactionEntries;

    if (filters.min_amount_usd !== undefined) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        (transaction.getAmountUsd() || 0) >= filters.min_amount_usd!
      );
    }

    if (filters.max_amount_usd !== undefined) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        (transaction.getAmountUsd() || 0) <= filters.max_amount_usd!
      );
    }

    const paymentTransactions = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || filteredTransactions.length,
        count: filteredTransactions.length || 0,
      },
      items: await Promise.all(filteredTransactions.map(async (transaction) => await transaction.toJSON())) || [],
    };

    R.handleSuccess(res, { payment_transactions: paymentTransactions });
  } catch (error: any) {
    console.error('⚠️ Erreur listing transactions de paiement:', error);
    if (error.issues) { // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: PAYMENT_TRANSACTION_CODES.VALIDATION_FAILED,
        message: PAYMENT_TRANSACTION_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: PAYMENT_TRANSACTION_CODES.LISTING_FAILED,
        message: PAYMENT_TRANSACTION_ERRORS.EXPORT_FAILED,
      });
    }
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID, GUID ou référence de paiement
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let transaction: PaymentTransaction | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      transaction = await PaymentTransaction._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!transaction) {
        transaction = await PaymentTransaction._load(numericId, true);
      }
    } else {
      // Essayer par référence de paiement
      transaction = await PaymentTransaction._load(identifier, false, true);
    }

    if (!transaction) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: PAYMENT_TRANSACTION_CODES.PAYMENT_TRANSACTION_NOT_FOUND,
        message: `Payment transaction with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, await transaction.toJSON());
  } catch (error: any) {
    console.error('⚠️ Erreur recherche transaction de paiement:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: PAYMENT_TRANSACTION_CODES.SEARCH_FAILED,
      message: PAYMENT_TRANSACTION_ERRORS.NOT_FOUND,
    });
  }
});

// endregion

export default router;