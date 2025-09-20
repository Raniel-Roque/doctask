import { format } from "date-fns";

// =========================================
// Types
// =========================================
interface Log {
  _id: string;
  user_id: string;
  user_role: number;
  user?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  } | null;
  affected_entity_type: string;
  affected_entity_id: string;
  affectedEntity?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    projectManager?: {
      last_name: string;
    };
  } | null;
  action: string;
  details: string;
  _creationTime: number;
}

interface LogTextReportProps {
  logs: Log[];
  title: string;
  userRole: number; // 0 = instructor, 1 = adviser
  filters?: {
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    actionFilters?: string[];
    entityTypeFilters?: string[];
    instructorFilters?: string[];
    adviserFilters?: string[];
  };
  sortBy?: string; // 'date', 'user', 'action', 'entity'
  sortOrder?: 'asc' | 'desc';
}

// =========================================
// Component
// =========================================
export const generateLogTextReport = ({
  logs,
  title,
  userRole,
  filters,
  sortBy = 'date',
  sortOrder = 'desc',
}: LogTextReportProps): string => {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  // Helper function to get user name
  const getUserName = (log: Log) => {
    if (log.user?.first_name && log.user?.last_name) {
      return `${log.user.first_name} ${log.user.middle_name ? log.user.middle_name + " " : ""}${log.user.last_name}`;
    }
    return userRole === 0 ? "Unknown Instructor" : "Unknown Adviser";
  };

  // Helper function to get affected entity name
  const getAffectedEntityName = (log: Log) => {
    if (log.affected_entity_type === "user") {
      if (log.affectedEntity?.first_name && log.affectedEntity?.last_name) {
        return `${log.affectedEntity.first_name} ${log.affectedEntity.middle_name ? log.affectedEntity.middle_name + " " : ""}${log.affectedEntity.last_name}`;
      }
      return "-";
    }
    if (log.affected_entity_type === "group") {
      if (log.affectedEntity?.projectManager?.last_name) {
        return `${log.affectedEntity.projectManager.last_name} et al`;
      } else {
        return "Unknown Group";
      }
    }
    if (log.affected_entity_type === "database") {
      return "Database";
    }
    return "-";
  };

  // Apply filters to logs
  let filteredLogs = [...logs];

  if (filters) {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        const userName = getUserName(log).toLowerCase();
        const affectedEntity = getAffectedEntityName(log).toLowerCase();
        const action = log.action.toLowerCase();
        const details = log.details.toLowerCase();
        
        return userName.includes(searchLower) ||
               affectedEntity.includes(searchLower) ||
               action.includes(searchLower) ||
               details.includes(searchLower);
      });
    }

    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log._creationTime) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      filteredLogs = filteredLogs.filter(log => 
        new Date(log._creationTime) <= endDate
      );
    }

    // Action filters
    if (filters.actionFilters && filters.actionFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.actionFilters!.includes(log.action)
      );
    }

    // Entity type filters
    if (filters.entityTypeFilters && filters.entityTypeFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.entityTypeFilters!.includes(log.affected_entity_type)
      );
    }

    // Instructor filters (by user ID)
    if (filters.instructorFilters && filters.instructorFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.instructorFilters!.includes(log.user_id)
      );
    }

    // Adviser filters (by user ID)
    if (filters.adviserFilters && filters.adviserFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.adviserFilters!.includes(log.user_id)
      );
    }
  }

  // Apply sorting to filtered logs
  filteredLogs.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a._creationTime - b._creationTime;
        break;
      case 'user':
        const userNameA = getUserName(a).toLowerCase();
        const userNameB = getUserName(b).toLowerCase();
        comparison = userNameA.localeCompare(userNameB);
        break;
      case 'action':
        comparison = a.action.toLowerCase().localeCompare(b.action.toLowerCase());
        break;
      case 'entity':
        const entityA = getAffectedEntityName(a).toLowerCase();
        const entityB = getAffectedEntityName(b).toLowerCase();
        comparison = entityA.localeCompare(entityB);
        break;
      default:
        // Default to date sorting
        comparison = a._creationTime - b._creationTime;
    }
    
    // Apply sort order
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Generate report header
  let report = `${title}\n`;
  report += `Generated on ${currentDate} at ${currentTime}\n`;
  report += `Total Records: ${filteredLogs.length}\n`;
  
  // Add filter information if any filters are applied
  const activeFilters = [];
  if (filters?.searchTerm) activeFilters.push(`Search: "${filters.searchTerm}"`);
  if (filters?.startDate) activeFilters.push(`Start Date: ${filters.startDate}`);
  if (filters?.endDate) activeFilters.push(`End Date: ${filters.endDate}`);
  if (filters?.actionFilters && filters.actionFilters.length > 0) {
    activeFilters.push(`Actions: ${filters.actionFilters.join(", ")}`);
  }
  if (filters?.entityTypeFilters && filters.entityTypeFilters.length > 0) {
    activeFilters.push(`Entity Types: ${filters.entityTypeFilters.join(", ")}`);
  }
  if (filters?.instructorFilters && filters.instructorFilters.length > 0) {
    activeFilters.push(`Instructors: ${filters.instructorFilters.length} selected`);
  }
  if (filters?.adviserFilters && filters.adviserFilters.length > 0) {
    activeFilters.push(`Advisers: ${filters.adviserFilters.length} selected`);
  }
  
  if (activeFilters.length > 0) {
    report += `Filters Applied: ${activeFilters.join(" | ")}\n`;
  }
  
  report += "\n".repeat(2);
  report += "=".repeat(100) + "\n";
  report += "LOG ENTRIES\n";
  report += "=".repeat(100) + "\n\n";

  // Generate log entries
  if (filteredLogs.length === 0) {
    report += "No logs found matching the current filters.\n";
  } else {
    filteredLogs.forEach((log, index) => {
      const dateTime = format(new Date(log._creationTime), "MMM dd, yyyy hh:mm a");
      const userName = getUserName(log);
      const action = log.action;
      const affectedEntity = getAffectedEntityName(log);
      const details = log.details;

      report += `[${dateTime}] [${userName}] [${action}] [${affectedEntity}] [${details}]\n`;
      
      // Add separator between entries for better readability
      if (index < filteredLogs.length - 1) {
        report += "-".repeat(100) + "\n";
      }
    });
  }

  report += "\n".repeat(2);
  report += "=".repeat(100) + "\n";
  report += `Report generated on ${currentDate} at ${currentTime}\n`;
  report += `Total entries: ${filteredLogs.length}\n`;

  return report;
};

// =========================================
// Download function
// =========================================
export const downloadLogTextReport = (
  logs: Log[],
  title: string,
  userRole: number,
  filters?: LogTextReportProps["filters"]
): void => {
  const reportContent = generateLogTextReport({ logs, title, userRole, filters });
  
  // Create blob and download
  const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  // Generate filename
  const date = new Date();
  const dateTime = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;
  
  const role = userRole === 0 ? "Instructor" : "Adviser";
  const filterSuffix = filters ? 
    Object.entries(filters)
      .filter(([, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
      .map(([key, value]) => `${key}-${Array.isArray(value) ? value.length : value}`)
      .join("_") : "all";
  
  const filename = `${role}Logs-${filterSuffix}-${dateTime}.txt`;
  
  // Create download link
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
};
