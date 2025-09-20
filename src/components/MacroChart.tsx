import React from 'react';
import { NutritionTargets } from '../types';

interface MacroChartProps {
  targets: NutritionTargets;
  current?: NutritionTargets;
  size?: 'sm' | 'md' | 'lg';
}

export default function MacroChart({ targets, current, size = 'md' }: MacroChartProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const totalCurrent = current ? current.proteines + current.glucides + current.lipides : 0;
  const totalTarget = targets.proteines + targets.glucides + targets.lipides;

  const proteinPercentage = (targets.proteines / totalTarget) * 100;
  const carbPercentage = (targets.glucides / totalTarget) * 100;
  const fatPercentage = (targets.lipides / totalTarget) * 100;

  const currentProteinPercentage = current ? (current.proteines / totalCurrent) * 100 : 0;
  const currentCarbPercentage = current ? (current.glucides / totalCurrent) * 100 : 0;
  const currentFatPercentage = current ? (current.lipides / totalCurrent) * 100 : 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg className={`${sizeClasses[size]} transform -rotate-90`} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
          
          {/* Protein arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeDasharray={`${proteinPercentage * 2.83} 283`}
            strokeDashoffset="0"
            className="transition-all duration-500"
          />
          
          {/* Carbs arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeDasharray={`${carbPercentage * 2.83} 283`}
            strokeDashoffset={`-${proteinPercentage * 2.83}`}
            className="transition-all duration-500"
          />
          
          {/* Fat arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="8"
            strokeDasharray={`${fatPercentage * 2.83} 283`}
            strokeDashoffset={`-${(proteinPercentage + carbPercentage) * 2.83}`}
            className="transition-all duration-500"
          />
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold text-gray-900 ${textSizes[size]}`}>
              {Math.round(targets.calories)}
            </div>
            <div className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
              kcal
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className={textSizes[size]}>
            <span className="font-medium">Protéines:</span>{' '}
            <span className="text-gray-600">
              {Math.round(targets.proteines)}g ({Math.round(proteinPercentage)}%)
            </span>
            {current && (
              <span className="ml-2 text-sm text-gray-500">
                | {Math.round(current.proteines)}g
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className={textSizes[size]}>
            <span className="font-medium">Glucides:</span>{' '}
            <span className="text-gray-600">
              {Math.round(targets.glucides)}g ({Math.round(carbPercentage)}%)
            </span>
            {current && (
              <span className="ml-2 text-sm text-gray-500">
                | {Math.round(current.glucides)}g
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className={textSizes[size]}>
            <span className="font-medium">Lipides:</span>{' '}
            <span className="text-gray-600">
              {Math.round(targets.lipides)}g ({Math.round(fatPercentage)}%)
            </span>
            {current && (
              <span className="ml-2 text-sm text-gray-500">
                | {Math.round(current.lipides)}g
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}