import { useState } from 'react';

const TechnologyPreviewBanner = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <header className="bg-amber-300 p-2 text-center dark:text-black">
        <h2>
          <span className="uppercase">Technology Preview</span> (
          <a onClick={toggleExpand} className="cursor-pointer hover:underline">
            {isExpanded ? 'Read less' : 'Read more'}
          </a>
          )
        </h2>
      </header>
      <header
        className={`bg-amber-100 p-2 text-center dark:text-black ${isExpanded ? '' : 'hidden'}`}
      >
        <div className="align-center mx-auto my-0 max-w-110 text-left">
          <p className={`p-2 ${isExpanded ? '' : 'hidden'}`}>
            This is a vibe coding tool from{' '}
            <a href="https://use-fireproof.com" target="_blank" className="hover:underline">
              Fireproof
            </a>
            . What's different about it is that we're thinking about your data.
          </p>
          <p className={`p-2 ${isExpanded ? '' : 'hidden'}`}>
            We're putting this out here to work out any kinks before we enable sharing of the data
            behind your app.
          </p>
        </div>
      </header>
    </>
  );
};

export default TechnologyPreviewBanner;
