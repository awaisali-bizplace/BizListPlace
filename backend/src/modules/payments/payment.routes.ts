import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

/** Public payment settings — what a listing owner needs in order to pay. */
export const paymentPublicRoutes = Router();
paymentPublicRoutes.get('/payment', optionalAuth, PaymentController.getPublicPaymentSettings);

/** Admin payment settings & receipt verification. */
export const paymentAdminRoutes = Router();
paymentAdminRoutes.use(requireAuth, requireRole(['admin']));
paymentAdminRoutes.get('/payment', PaymentController.getPaymentSettings);
paymentAdminRoutes.patch('/payment', PaymentController.updatePaymentSettings);
paymentAdminRoutes.post('/payment/methods', PaymentController.addPaymentMethod);
paymentAdminRoutes.patch('/payment/methods/:methodId', PaymentController.updatePaymentMethod);
paymentAdminRoutes.delete('/payment/methods/:methodId', PaymentController.deletePaymentMethod);
paymentAdminRoutes.patch('/payment/methods/:methodId/toggle', PaymentController.togglePaymentMethod);
paymentAdminRoutes.delete('/payment/qr', PaymentController.deleteQrCode);

export default paymentAdminRoutes;
