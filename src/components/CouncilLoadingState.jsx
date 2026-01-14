/**
 * Council Loading State Component
 *
 * Beautiful animated loading state that shows the AI Council
 * "discussing" and enhancing the user's tattoo idea.
 *
 * Features:
 * - Animated avatar circles representing council members
 * - Progress steps showing council workflow
 * - Pulsing animations and transitions
 * - Informative status messages
 */

import { useEffect, useState } from 'react';

const COUNCIL_MEMBERS = [
  { name: 'Creative Director', color: 'from-purple-500 to-pink-500', icon: 'CD' },
  { name: 'Technical Expert', color: 'from-blue-500 to-cyan-500', icon: 'TE' },
  { name: 'Style Specialist', color: 'from-green-500 to-emerald-500', icon: 'SS' },
  { name: 'Composition Guru', color: 'from-orange-500 to-red-500', icon: 'CG' }
];

const DISCUSSION_PHASES = [
  { step: 1, label: 'Analyzing your idea...', duration: 2000 },
  { step: 2, label: 'Council discussing style...', duration: 3000 },
  { step: 3, label: 'Refining composition...', duration: 2500 },
  { step: 4, label: 'Generating prompts...', duration: 2000 }
];

export default function CouncilLoadingState({ message = 'AI Council Enhancing...' }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [activeMembers, setActiveMembers] = useState([]);

  useEffect(() => {
    // Cycle through discussion phases
    const phaseInterval = setInterval(() => {
      setCurrentPhase(prev => (prev + 1) % DISCUSSION_PHASES.length);
    }, 2500);

    // Randomly activate council members (simulating discussion)
    const memberInterval = setInterval(() => {
      const randomMember = Math.floor(Math.random() * COUNCIL_MEMBERS.length);
      setActiveMembers(prev => {
        const newActive = [...prev, randomMember];
        if (newActive.length > 2) newActive.shift(); // Keep max 2 active
        return newActive;
      });
    }, 800);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(memberInterval);
    };
  }, []);

  return (
    <div className="py-8 space-y-6">
      {/* Council Members Circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-64 h-64">
          {COUNCIL_MEMBERS.map((member, index) => {
            const angle = (index / COUNCIL_MEMBERS.length) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * 80;
            const y = Math.sin(angle) * 80;
            const isActive = activeMembers.includes(index);

            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isActive ? 1.1 : 1})`
                }}
              >
                <div className={`
                  w-16 h-16 rounded-full bg-gradient-to-br ${member.color}
                  flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em]
                  transition-all duration-500
                  ${isActive ? 'shadow-lg ring-4 ring-white ring-opacity-50' : 'shadow-md'}
                `}>
                  {member.icon}
                </div>
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-white opacity-30 animate-ping" />
                )}
              </div>
            );
          })}

          {/* Center Icon */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-gray-900">
          {message}
        </p>
        <p className="text-sm text-gray-600 animate-pulse">
          {DISCUSSION_PHASES[currentPhase].label}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="max-w-md mx-auto">
        <div className="flex justify-between">
          {DISCUSSION_PHASES.map((phase, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                transition-all duration-500
                ${index <= currentPhase
                  ? 'bg-blue-600 text-white shadow-lg scale-110'
                  : 'bg-gray-200 text-gray-400'
                }
              `}>
                {index < currentPhase ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  phase.step
                )}
              </div>
              {index < DISCUSSION_PHASES.length - 1 && (
                <div className={`
                  h-1 w-full mt-4 transition-all duration-500
                  ${index < currentPhase ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fun Fact */}
      <div className="text-center">
        <p className="text-xs text-gray-500 italic">
          The council is analyzing style, composition, and artistic details to create the perfect prompt
        </p>
      </div>
    </div>
  );
}
