import React, { useState, useEffect, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { callAI } from 'call-ai';

export default function BodyTransformer() {
  const { database, useLiveQuery } = useFireproof('body-transformer');
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(0);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const { docs } = useLiveQuery('timestamp', { descending: true, limit: 10 });

  const saveTransformation = async (html) => {
    await database.put({
      html,
      timestamp: Date.now(),
      iteration: iterations + 1,
    });
    setIterations((prev) => prev + 1);
  };

  const transformBody = async () => {
    if (!containerRef.current) return;

    const currentHTML = containerRef.current.innerHTML;

    try {
      const prompt = `Here's the current HTML of a webpage. Make it more interesting, creative, and visually appealing with orange synthwave styling. Add new elements, improve text, or modify layout, but keep the core functionality. Current HTML: ${currentHTML}`;

      const newHTML = await callAI(prompt);

      if (newHTML && containerRef.current) {
        containerRef.current.innerHTML = newHTML;
        await saveTransformation(newHTML);
      }
    } catch (error) {
      console.error('Error transforming body:', error);
    }
  };

  const toggleTransformation = () => {
    if (isRunning) {
      clearInterval(intervalRef.current);
    } else {
      transformBody();
      intervalRef.current = setInterval(transformBody, 1000);
    }
    setIsRunning(!isRunning);
  };

  const loadHistoricalVersion = (html) => {
    if (containerRef.current) {
      containerRef.current.innerHTML = html;
    }
  };

  const addDemoData = async () => {
    const demoHTML = await callAI(
      'Create a simple webpage about AI evolution with headings, paragraphs, and an orange synthwave aesthetic.'
    );
    if (containerRef.current) {
      containerRef.current.innerHTML = demoHTML;
      await saveTransformation(demoHTML);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-lg border border-orange-500 bg-gray-800 p-4 shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-orange-400">Body Transformer</h1>
          <p className="mb-4 text-gray-300 italic">
            *This application uses AI to continuously evolve your webpage's HTML content. Every
            second, it captures the current HTML, sends it to an AI model, and replaces it with a
            more interesting version. Watch as your page gradually transforms through multiple
            iterations, creating an ever-evolving digital experience.*
          </p>
          <div className="mb-4 flex space-x-4">
            <button
              onClick={toggleTransformation}
              className={`rounded-md px-4 py-2 font-bold ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} transition-colors`}
            >
              {isRunning ? 'Stop Transformation' : 'Start Transformation'}
            </button>
            <button
              onClick={addDemoData}
              className="rounded-md bg-purple-600 px-4 py-2 font-bold transition-colors hover:bg-purple-700"
            >
              Demo Data
            </button>
          </div>
          <div className="text-sm text-gray-400">Iterations: {iterations}</div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="min-h-[400px] rounded-lg border border-orange-500 bg-gray-800 p-4 shadow-lg">
              <div ref={containerRef} className="prose prose-invert max-w-none">
                <h2>Welcome to the Body Transformer</h2>
                <p>Click "Start Transformation" to begin evolving this content with AI.</p>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto rounded-lg border border-orange-500 bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-orange-400">Transformation History</h2>
            {docs.length > 0 ? (
              <ul className="space-y-3">
                {docs.map((doc) => (
                  <li key={doc._id} className="rounded border border-gray-700 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-orange-300">Iteration {doc.iteration}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(doc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => loadHistoricalVersion(doc.html)}
                      className="w-full rounded bg-gray-700 px-2 py-1 text-left text-sm transition-colors hover:bg-gray-600"
                    >
                      Load this version
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No transformations yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
