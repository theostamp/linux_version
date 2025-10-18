import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, Building, Users, BarChart3, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const { userData, plan, paymentMethod } = location.state || {};

  useEffect(() => {
    if (!userData || !plan) {
      navigate('/register');
      return;
    }

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userData, plan, navigate]);

  const handleResendEmail = async () => {
    try {
      // Simulate API call to resend verification email
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEmailSent(true);
      toast.success('Verification email sent!');
    } catch (error) {
      toast.error('Failed to send email. Please try again.');
    }
  };

  const quickActions = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Add Users",
      description: "Invite team members to your building",
      action: "Get Started"
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "Add Apartments",
      description: "Set up your building's apartment structure",
      action: "Get Started"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "View Analytics",
      description: "Explore your building's performance data",
      action: "View Now"
    }
  ];

  if (!userData || !plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Digital Concierge</span>
            </div>
            <div className="text-sm text-gray-600">
              Redirecting to dashboard in {countdown}s
            </div>
          </div>
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Digital Concierge!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your account has been created successfully and your subscription is now active.
          </p>
        </div>

        {/* Success Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's Next?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account Created
              </h3>
              <p className="text-gray-600 text-sm">
                Your building account is ready to use
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Payment Processed
              </h3>
              <p className="text-gray-600 text-sm">
                Your {plan.name} subscription is active
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email Verification
              </h3>
              <p className="text-gray-600 text-sm">
                Check your email for verification link
              </p>
            </div>
          </div>
        </div>

        {/* Account Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Account Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Building Information
              </h3>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-semibold">Name:</span> {userData.buildingName}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Address:</span> {userData.address}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Admin:</span> {userData.name}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Email:</span> {userData.email}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Subscription Details
              </h3>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-semibold">Plan:</span> {plan.name}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Price:</span> €{plan.price}/month
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Status:</span> 
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Next Billing:</span> Next month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-8">
          <div className="flex items-start">
            <Mail className="w-8 h-8 text-blue-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                Verify Your Email Address
              </h3>
              <p className="text-blue-700 mb-4">
                We've sent a verification email to <strong>{userData.email}</strong>. 
                Please check your inbox and click the verification link to complete your account setup.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleResendEmail}
                  disabled={isEmailSent}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isEmailSent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isEmailSent ? 'Email Sent!' : 'Resend Email'}
                </button>
                <a
                  href={`mailto:${userData.email}`}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center"
                >
                  Open Email App
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Start Guide
          </h2>
          <p className="text-gray-600 mb-8">
            Get started with these essential steps to set up your building management system.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 mr-3">
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {action.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {action.description}
                </p>
                <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center">
                  {action.action}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors flex items-center mx-auto"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            You'll be automatically redirected in {countdown} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;

