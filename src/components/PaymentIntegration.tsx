import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PaymentIntegrationProps {
  amount: number;
  currency?: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: any) => void;
  onCancel?: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'wallet' | 'upi';
  name: string;
  icon: string;
  enabled: boolean;
}

interface PaymentFormData {
  method: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  upiId: string;
  bankCode: string;
}

const PaymentIntegration: React.FC<PaymentIntegrationProps> = ({
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [formData, setFormData] = useState<PaymentFormData>({
    method: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    upiId: '',
    bankCode: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [processingStep, setProcessingStep] = useState<string>('');

  const paymentMethodsData: PaymentMethod[] = [
    {
      id: 'card',
      type: 'card',
      name: 'Credit/Debit Card',
      icon: '💳',
      enabled: true
    },
    {
      id: 'upi',
      type: 'upi',
      name: 'UPI Payment',
      icon: '📱',
      enabled: true
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      icon: '🏦',
      enabled: true
    },
    {
      id: 'wallet',
      type: 'wallet',
      name: 'Digital Wallet',
      icon: '💰',
      enabled: false
    }
  ];

  useEffect(() => {
    setPaymentMethods(paymentMethodsData);
  }, []);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setFormData(prev => ({ ...prev, method: methodId }));
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    return formatted;
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const validateCardNumber = (cardNumber: string) => {
    // Luhn algorithm for card validation
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const getCardType = (cardNumber: string) => {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.startsWith('4')) return 'Visa';
    if (digits.startsWith('5') || digits.startsWith('2')) return 'Mastercard';
    if (digits.startsWith('3')) return 'American Express';
    if (digits.startsWith('6')) return 'Discover';
    
    return 'Unknown';
  };

  const validateForm = () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return false;
    }

    if (selectedMethod === 'card') {
      if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cvv || !formData.cardholderName) {
        toast.error('Please fill in all card details');
        return false;
      }

      if (!validateCardNumber(formData.cardNumber)) {
        toast.error('Invalid card number');
        return false;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryYear = parseInt(formData.expiryYear);
      const expiryMonth = parseInt(formData.expiryMonth);

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        toast.error('Card has expired');
        return false;
      }
    }

    if (selectedMethod === 'upi') {
      if (!formData.upiId) {
        toast.error('Please enter UPI ID');
        return false;
      }

      if (!formData.upiId.includes('@')) {
        toast.error('Invalid UPI ID format');
        return false;
      }
    }

    return true;
  };

  const processPayment = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    setProcessingStep('Validating payment details...');

    try {
      // Simulate payment processing steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessingStep('Processing payment...');

      const paymentData = {
        amount,
        currency,
        method: selectedMethod,
        ...formData
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingStep('Confirming transaction...');

      // Simulate payment success
      const paymentResult = {
        transaction_id: `txn_${Date.now()}`,
        status: 'success',
        amount,
        currency,
        method: selectedMethod,
        timestamp: new Date().toISOString()
      };

      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Payment processed successfully!');
      
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentResult);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const renderPaymentForm = () => {
    switch (selectedMethod) {
      case 'card':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  maxLength={19}
                  className="pr-10"
                />
                <div className="absolute right-3 top-3">
                  {formData.cardNumber && (
                    <Badge variant="outline">
                      {getCardType(formData.cardNumber)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Select
                  value={formData.expiryMonth}
                  onValueChange={(value) => handleInputChange('expiryMonth', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Select
                  value={formData.expiryYear}
                  onValueChange={(value) => handleInputChange('expiryYear', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative">
                  <Input
                    id="cvv"
                    type={showCardDetails ? 'text' : 'password'}
                    placeholder="123"
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    maxLength={4}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCardDetails(!showCardDetails)}
                  >
                    {showCardDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 'upi':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                type="text"
                placeholder="yourname@paytm"
                value={formData.upiId}
                onChange={(e) => handleInputChange('upiId', e.target.value)}
              />
            </div>
          </div>
        );

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Bank transfer details will be provided after booking confirmation.
                Payment must be completed within 24 hours.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Amount */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">
              {currency} {amount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <Label>Select Payment Method</Label>
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={`cursor-pointer transition-all ${
                    selectedMethod === method.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : method.enabled
                      ? 'hover:shadow-md'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => method.enabled && handleMethodSelect(method.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{method.icon}</div>
                    <div className="font-medium">{method.name}</div>
                    {!method.enabled && (
                      <div className="text-xs text-gray-500 mt-1">Coming Soon</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          {selectedMethod && renderPaymentForm()}

          {/* Security Notice */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your payment information is encrypted and secure. We do not store your card details.
            </AlertDescription>
          </Alert>

          {/* Processing Status */}
          {isProcessing && (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">{processingStep}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>

            <Button
              onClick={processPayment}
              disabled={!selectedMethod || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay {currency} {amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentIntegration;
