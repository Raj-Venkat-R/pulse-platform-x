const { Pool } = require('pg');

class PaymentService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async processPayment(paymentData) {
    try {
      // Mock payment processing - in real implementation, integrate with payment gateway
      const { amount, payment_method, payment_details } = paymentData;
      
      // Simulate payment processing
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Log payment transaction
        await this.logPaymentTransaction({
          transaction_id: transactionId,
          amount: amount,
          payment_method: payment_method,
          status: 'success',
          payment_details: payment_details
        });
        
        return {
          success: true,
          transaction_id: transactionId,
          status: 'paid',
          amount: amount
        };
      } else {
        // Log failed payment
        await this.logPaymentTransaction({
          transaction_id: null,
          amount: amount,
          payment_method: payment_method,
          status: 'failed',
          payment_details: payment_details,
          error_message: 'Payment processing failed'
        });
        
        return {
          success: false,
          status: 'failed',
          error: 'Payment processing failed'
        };
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  async logPaymentTransaction(transactionData) {
    const query = `
      INSERT INTO payment_transactions (
        transaction_id, amount, payment_method, status, 
        payment_details, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const values = [
      transactionData.transaction_id,
      transactionData.amount,
      transactionData.payment_method,
      transactionData.status,
      JSON.stringify(transactionData.payment_details),
      transactionData.error_message
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getPaymentStatus(transactionId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE transaction_id = $1
    `;

    const result = await this.pool.query(query, [transactionId]);
    return result.rows[0];
  }

  async refundPayment(transactionId, refundAmount) {
    try {
      // Get original transaction
      const originalTransaction = await this.getPaymentStatus(transactionId);
      
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (originalTransaction.status !== 'success') {
        throw new Error('Cannot refund unsuccessful transaction');
      }

      // Mock refund processing
      const refundTransactionId = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Log refund transaction
      await this.logPaymentTransaction({
        transaction_id: refundTransactionId,
        amount: -refundAmount, // Negative amount for refund
        payment_method: originalTransaction.payment_method,
        status: 'refunded',
        payment_details: { original_transaction_id: transactionId },
        error_message: null
      });

      return {
        success: true,
        refund_transaction_id: refundTransactionId,
        refund_amount: refundAmount,
        status: 'refunded'
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
