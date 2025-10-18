import React from 'react';
import { Building, Users, BarChart3, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const features = [
    {
      icon: <Building className="w-8 h-8 text-primary-600" />,
      title: "Building Management",
      description: "Streamline your building operations with our comprehensive management tools."
    },
    {
      icon: <Users className="w-8 h-8 text-primary-600" />,
      title: "Resident Portal",
      description: "Provide residents with easy access to building services and communications."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary-600" />,
      title: "Analytics & Reports",
      description: "Get insights into your building's performance with detailed analytics."
    },
    {
      icon: <Shield className="w-8 h-8 text-primary-600" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee."
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: 29,
      description: "Perfect for small buildings",
      features: [
        "Up to 20 apartments",
        "Up to 10 users",
        "Basic management tools",
        "Email support",
        "50 documents storage"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: 59,
      description: "Advanced features for growing properties",
      features: [
        "Up to 100 apartments",
        "Up to 25 users",
        "Advanced analytics",
        "Reporting tools",
        "Priority support",
        "1GB storage"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: 99,
      description: "Complete solution for large portfolios",
      features: [
        "Unlimited apartments",
        "Unlimited users",
        "Custom integrations",
        "White-label options",
        "Premium support",
        "Unlimited storage"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Digital Concierge</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Building Management
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline operations, enhance resident experience, and grow your property management business with our comprehensive digital platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register" 
                className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Trusted by 500+ buildings across Greece
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Building
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to efficiently manage your building operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select the perfect plan for your building management needs. All plans include our core features.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                  plan.popular ? 'ring-2 ring-primary-600 transform scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-gray-900">€{plan.price}</span>
                    <span className="text-xl text-gray-600 ml-1">/month</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link 
                  to={`/register?plan=${plan.name.toLowerCase()}`}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Building Management?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of building managers who have already transformed their operations with Digital Concierge.
          </p>
          <Link 
            to="/register" 
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building className="w-8 h-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">Digital Concierge</span>
              </div>
              <p className="text-gray-400">
                Transforming building management with digital solutions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Digital Concierge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

