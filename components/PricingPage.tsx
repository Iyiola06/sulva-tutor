
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { usePaystackPayment } from 'react-paystack';
import { supabase } from '../lib/supabaseClient';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUsage } = useAuth();

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxx';

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: 900 * 100, // 900 NGN (or generic currency), converted to kobo
    publicKey: publicKey,
    metadata: {
      user_id: user?.id, // Send user ID to webhook for subscription creation
    },
  };

  const onSuccess = async (reference: any) => {
    if (!user) return;

    // Payment successful! Webhook will create subscription server-side
    // Just refresh the auth context to detect the new subscription
    await refreshUsage();
    alert(`Payment Successful! Your Pro subscription is now active. Receipt sent to ${user.email}.`);
    navigate('/');
  };

  const onClose = () => {
    // implementation for  whatever you want to do when the Paystack dialog closed.
    console.log('closed');
  };

  const PaystackHook = () => {
    const initializePayment = usePaystackPayment(config);
    return (
      <button onClick={() => {
        initializePayment(onSuccess, onClose)
      }}
        className="w-full py-4 rounded-xl font-black transition-all shadow-lg bg-brand-600 text-white hover:bg-brand-700">
        Upgrade Now
      </button>
    );
  };


  const handleUpgrade = (plan: any) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (plan.price === '$0') {
      navigate('/');
      return;
    }
    // Logic is now inside the specific button component for Paystack
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: ['3 AI Quizzes per day', 'Basic Study Guides', 'Community Support'],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$9',
      period: '/month',
      features: ['Unlimited AI Quizzes', 'Detailed Study Blueprints', 'Handwriting Grading', 'Priority Support'],
      cta: 'Upgrade Now',
      popular: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Invest in your <span className="text-brand-600">Grades</span></h2>
        <p className="text-xl text-slate-500 font-medium">Choose the plan that fits your study style.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative p-8 rounded-[2.5rem] ${plan.popular ? 'bg-brand-600 text-white shadow-2xl scale-105 z-10' : 'bg-white text-slate-900 border border-slate-100 shadow-xl'}`}>
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-yellow-900 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-md">
                Best Value
              </div>
            )}
            <h3 className={`text-2xl font-black mb-2 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-black tracking-tight">{plan.price}</span>
              {plan.period && <span className={`text-lg font-medium ${plan.popular ? 'text-brand-200' : 'text-slate-400'}`}>{plan.period}</span>}
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 font-medium">
                  <i className={`fas fa-check-circle ${plan.popular ? 'text-brand-200' : 'text-green-500'}`}></i>
                  {feature}
                </li>
              ))}
            </ul>

            {plan.popular && user ? (
              <PaystackHook />
            ) : (
              <button
                onClick={() => handleUpgrade(plan)}
                className={`w-full py-4 rounded-xl font-black transition-all shadow-lg ${plan.popular ? 'bg-white text-brand-600 hover:bg-brand-50' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
              >
                {plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-slate-400 text-sm">
        <p>Secure payments processed by Paystack.</p>
        <div className="flex justify-center gap-4 mt-4 text-2xl">
          <i className="fas fa-lock"></i>
          <i className="fas fa-credit-card"></i>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
