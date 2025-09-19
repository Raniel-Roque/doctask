import React from "react";
import {
  PasswordStrength,
  getStrengthColor,
  getStrengthLabel,
} from "@/utils/passwordStrength";

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  showLabel?: boolean;
  showFeedback?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  strength,
  showLabel = true,
  showFeedback = true,
}) => {
  const progressPercentage = (strength.score / 4) * 100;

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Strength Label and Feedback */}
      <div className="flex flex-col space-y-1">
        {showLabel && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Password Strength:
            </span>
            <span
              className={`text-sm font-semibold ${
                strength.score === 0
                  ? "text-red-600"
                  : strength.score === 1
                    ? "text-orange-600"
                    : strength.score === 2
                      ? "text-yellow-600"
                      : strength.score === 3
                        ? "text-blue-600"
                        : "text-green-600"
              }`}
            >
              {getStrengthLabel(strength.score)}
            </span>
          </div>
        )}

        {showFeedback && strength.feedback && (
          <p
            className={`text-xs ${
              strength.score === 0
                ? "text-red-600"
                : strength.score === 1
                  ? "text-orange-600"
                  : strength.score === 2
                    ? "text-yellow-600"
                    : strength.score === 3
                      ? "text-blue-600"
                      : "text-green-600"
            }`}
          >
            {strength.feedback}
          </p>
        )}
      </div>
    </div>
  );
};
