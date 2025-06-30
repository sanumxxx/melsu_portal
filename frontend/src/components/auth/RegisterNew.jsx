import React, { useState } from 'react';
import EmailStep from './EmailStep';
import CodeStep from './CodeStep';
import RegistrationStep from './RegistrationStep';

const RegisterNew = ({ onLogin }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 = email, 2 = code, 3 = registration
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    gender: '',
    password: '',
    confirmPassword: ''
  });

  const handleEmailNext = () => {
    setCurrentStep(2);
  };

  const handleCodeNext = (code) => {
    setVerificationCode(code);
    setCurrentStep(3);
  };

  const handleCodePrev = () => {
    setCurrentStep(1);
  };

  const handleRegistrationPrev = () => {
    setCurrentStep(2);
  };

  const handleRegistrationSuccess = (userData) => {
    onLogin(userData);
  };

  return (
    <div>
      {currentStep === 1 && (
        <EmailStep
          onNext={handleEmailNext}
          formData={formData}
          setFormData={setFormData}
        />
      )}
      
      {currentStep === 2 && (
        <CodeStep
          onNext={handleCodeNext}
          onPrev={handleCodePrev}
          formData={formData}
        />
      )}
      
      {currentStep === 3 && (
        <RegistrationStep
          onPrev={handleRegistrationPrev}
          formData={formData}
          setFormData={setFormData}
          verificationCode={verificationCode}
          onSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
};

export default RegisterNew; 