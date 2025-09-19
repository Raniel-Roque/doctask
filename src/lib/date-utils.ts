/**
 * Date formatting utilities that avoid hydration mismatches
 * by ensuring consistent formatting between server and client
 */

export const formatDate = (
  timestamp: number,
  options?: {
    year?: boolean;
    month?: boolean;
    day?: boolean;
    hour?: boolean;
    minute?: boolean;
    hour12?: boolean;
  },
) => {
  const date = new Date(timestamp);

  // Use consistent formatting options to avoid locale differences
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: options?.year !== false ? "numeric" : undefined,
    month: options?.month !== false ? "short" : undefined,
    day: options?.day !== false ? "numeric" : undefined,
    hour: options?.hour ? "2-digit" : undefined,
    minute: options?.minute ? "2-digit" : undefined,
    hour12: options?.hour12 !== false,
  };

  // Remove undefined values
  Object.keys(formatOptions).forEach((key) => {
    if (formatOptions[key as keyof Intl.DateTimeFormatOptions] === undefined) {
      delete formatOptions[key as keyof Intl.DateTimeFormatOptions];
    }
  });

  return date.toLocaleDateString("en-US", formatOptions);
};

export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} ${timeStr}`;
};

export const formatDateOnly = (timestamp: number) => {
  return formatDate(timestamp, { hour: false, minute: false });
};

export const formatTimeOnly = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getCurrentDateString = () => {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
