import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building, User, Mail, MapPin, Lock, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedPlan = searchParams.get('plan') || 'professional';
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      plan: selectedPlan
    }
  });

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      description: 'Perfect for small buildings',
      features: [
        'Up to 20 apartments',
        'Up to 10 users',
        'Basic management tools',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 59,
      description: 'Advanced features for growing properties',
      features: [
        'Up to 100 apartments',
        'Up to 25 users',
        'Advanced analytics',
        'Reporting tools',
        'Priority support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      description: 'Complete solution for large portfolios',
      features: [
        'Unlimited apartments',
        'Unlimited users',
        'Custom integrations',
        'White-label options',
        'Premium support'
      ]
    }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call the backend API
      console.log('Registration data:', data);
      
      toast.success('Account created successfully! Redirecting to payment...');
      
      // Redirect to payment page
      navigate('/payment', { 
        state: { 
          userData: data,
          plan: plans.find(p => p.id === data.plan)
        }
      });
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 px-8 py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-white" />
              <span className="ml-2 text-2xl font-bold text-white">Digital Concierge</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-4">
              Create Your Building Account
            </h1>
            <p className="text-primary-100 mt-2">
              Step {currentStep} of 3: {currentStep === 1 ? 'Basic Information' : currentStep === 2 ? 'Plan Selection' : 'Review & Confirm'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="px-8 py-4 bg-gray-50">
            <div className="flex items-center">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step}</span>
                    )}
                  </div>
                  {step < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-primary-600' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      {...register('name', { required: 'Name is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="John Building Manager"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-2" />
                    Building Name
                  </label>
                  <input
                    type="text"
                    {...register('buildingName', { required: 'Building name is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Central Plaza"
                  />
                  {errors.buildingName && (
                    <p className="text-red-500 text-sm mt-1">{errors.buildingName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <input
                    type="text"
                    {...register('address', { required: 'Address is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Athens, Greece"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <input
                    type="password"
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter a secure password"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Plan Selection */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Choose Your Plan
                  </h2>
                  <p className="text-gray-600">
                    Select the perfect plan for your building management needs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        watch('plan') === plan.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setValue('plan', plan.id)}
                    >
                      {plan.id === 'professional' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {plan.description}
                        </p>
                        <div className="flex items-baseline justify-center">
                          <span className="text-3xl font-bold text-gray-900">€{plan.price}</span>
                          <span className="text-gray-600 ml-1">/month</span>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className={`w-full py-2 px-4 rounded-lg text-center font-semibold ${
                        watch('plan') === plan.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {watch('plan') === plan.id ? 'Selected' : 'Select Plan'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Review Your Information
                  </h2>
                  <p className="text-gray-600">
                    Please review your details before proceeding to payment
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                      <p className="text-gray-600">{watch('name')}</p>
                      <p className="text-gray-600">{watch('email')}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Building Information</h3>
                      <p className="text-gray-600">{watch('buildingName')}</p>
                      <p className="text-gray-600">{watch('address')}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Selected Plan</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {plans.find(p => p.id === watch('plan'))?.name} Plan
                        </p>
                        <p className="text-gray-600 text-sm">
                          {plans.find(p => p.id === watch('plan'))?.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          €{plans.find(p => p.id === watch('plan'))?.price}/month
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">
                        30-day money-back guarantee
                      </h4>
                      <p className="text-blue-700 text-sm">
                        If you're not satisfied with our service, we'll refund your first month's payment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;

