import React from 'react';

const WelcomeScreen = () => {
  return (
    <div className="bg-light-background-00 dark:bg-dark-background-00 flex h-full flex-col items-center justify-center">
      <img src="/lightup.png" alt="Lightup" className="logo-pulse h-auto w-full max-w-xs" />
    </div>
  );
};

export default WelcomeScreen;
