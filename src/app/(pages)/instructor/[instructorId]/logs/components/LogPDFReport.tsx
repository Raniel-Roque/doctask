import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Table, TH, TR, TD } from "@ag-media/react-pdf-table";
import { formatDateTime } from "@/lib/date-utils";
import { Id } from "../../../../../../../convex/_generated/dataModel";

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#666",
  },
  noData: {
    textAlign: "center",
    padding: 20,
    fontSize: 12,
    color: "#666",
  },
});

// Minimalist cell style for table
const cellStyle = {
  fontSize: 9,
  padding: 3,
  wordBreak: "keep-all",
  whiteSpace: "nowrap",
};

// Types
interface Log {
  _id: Id<"LogsTable">;
  user_id: Id<"users">;
  user_role: number;
  user?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  } | null;
  affected_entity_type: string;
  affected_entity_id: Id<"users"> | Id<"groupsTable">;
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

interface LogPDFReportProps {
  logs: Log[];
  title: string;
  userRole: number; // 0 = instructor, 1 = adviser
  filters?: {
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    actionFilters?: string[];
    entityTypeFilters?: string[];
  };
}

const LogPDFReport: React.FC<LogPDFReportProps> = ({
  logs = [],
  title,
  userRole,
  filters,
}) => {
  const currentDate = new Date().toLocaleDateString();

  // Ensure logs is an array and filter out any invalid entries
  const validLogs = Array.isArray(logs)
    ? logs.filter(
        (log) =>
          log &&
          typeof log === "object" &&
          "_id" in log &&
          "action" in log &&
          "details" in log &&
          "_creationTime" in log,
      )
    : [];

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
  let filteredLogs = [...validLogs];

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
      const startDate = new Date(filters.startDate + 'T00:00:00.000Z').getTime();
      filteredLogs = filteredLogs.filter(log => log._creationTime >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate + 'T23:59:59.999Z').getTime();
      filteredLogs = filteredLogs.filter(log => log._creationTime <= endDate);
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
  }

  // Sort logs by creation time (newest first)
  filteredLogs.sort((a, b) => b._creationTime - a._creationTime);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || "System Logs Report"}</Text>
          <Text style={styles.subtitle}>Generated on {currentDate}</Text>
        </View>

        {filteredLogs.length > 0 ? (
          <Table weightings={[1.2, 1.2, 0.8, 1.2, 2.4]}>
            <TH>
              <TD style={cellStyle}>Date & Time</TD>
              <TD style={cellStyle}>{userRole === 0 ? "Instructor" : "Adviser"}</TD>
              <TD style={cellStyle}>Action</TD>
              <TD style={cellStyle}>Entity</TD>
              <TD style={cellStyle}>Details</TD>
            </TH>
            {filteredLogs.map((log) => (
              <TR key={log._id}>
                <TD style={cellStyle}>{formatDateTime(log._creationTime)}</TD>
                <TD style={cellStyle}>{getUserName(log)}</TD>
                <TD style={cellStyle}>{log.action}</TD>
                <TD style={cellStyle}>{getAffectedEntityName(log)}</TD>
                <TD style={cellStyle}>{log.details}</TD>
              </TR>
            ))}
          </Table>
        ) : (
          <View style={styles.noData}>
            <Text>No logs found matching the current filters</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Total Records: {filteredLogs.length}
          {"\n"}
          {filters &&
            Object.entries(filters).filter(([, value]) => {
              if (
                !value ||
                (Array.isArray(value) && value.length === 0)
              )
                return false;
              return true;
            }).length > 0 &&
            "Filters: " +
              Object.entries(filters)
                .filter(([, value]) => {
                  if (
                    !value ||
                    (Array.isArray(value) && value.length === 0)
                  )
                    return false;
                  return true;
                })
                .map(([key, value]) => {
                  const capKey = key.charAt(0).toUpperCase() + key.slice(1);
                  const capValue = Array.isArray(value) 
                    ? value.join(", ")
                    : value;
                  return `${capKey}: ${capValue}`;
                })
                .join(", ")}
        </Text>
      </Page>
    </Document>
  );
};

export default LogPDFReport;
