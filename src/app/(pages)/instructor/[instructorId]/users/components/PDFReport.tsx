import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Table, TH, TR, TD } from '@ag-media/react-pdf-table';
import { User } from './types';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
  noData: {
    textAlign: 'center',
    padding: 20,
    fontSize: 12,
    color: '#666',
  },
});

// Minimalist cell style for table
const cellStyle = { fontSize: 10, padding: 4, wordBreak: 'keep-all', whiteSpace: 'nowrap' };

interface PDFReportProps {
  users: User[];
  title: string;
  filters?: {
    status?: string;
    subrole?: string;
  };
  isStudent?: boolean;
  adviserCodes?: Record<string, { code: string }>;
}

const PDFReport: React.FC<PDFReportProps> = ({ 
  users = [], 
  title, 
  filters, 
  isStudent = false,
  adviserCodes = {}
}) => {
  const currentDate = new Date().toLocaleDateString();
  
  // Ensure users is an array and filter out any invalid entries
  const validUsers = Array.isArray(users) ? users.filter(user => 
    user && 
    typeof user === 'object' && 
    'first_name' in user && 
    'last_name' in user && 
    'email' in user
  ) : [];

  const filteredUsers = validUsers.filter(user => {
    if (!filters?.status || filters.status === 'all') return true;
    return user.email_verified === (filters.status === 'verified');
  });

  const getSubroleName = (subrole: number | undefined) => {
    switch (subrole) {
      case 0: return 'Member';
      case 1: return 'Manager';
      default: return 'Unknown';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Users Report'}</Text>
          <Text style={styles.subtitle}>
            Generated on {currentDate}
          </Text>
        </View>

        {filteredUsers.length > 0 ? (
          <Table weightings={[0.9, 0.9, 0.9, 2, 0.9, 1.5]}>
            <TH>
              <TD style={cellStyle}>First Name</TD>
              <TD style={cellStyle}>Middle Name</TD>
              <TD style={cellStyle}>Last Name</TD>
              <TD style={cellStyle}>Email</TD>
              <TD style={cellStyle}>Status</TD>
              <TD style={cellStyle}>{isStudent ? 'Role' : 'Adviser Code'}</TD>
            </TH>
            {filteredUsers.map((user) => (
              <TR key={user._id}>
                <TD style={cellStyle}>{user.first_name}</TD>
                <TD style={cellStyle}>{user.middle_name || '-'}</TD>
                <TD style={cellStyle}>{user.last_name}</TD>
                <TD style={cellStyle}>{user.email}</TD>
                <TD style={cellStyle}>{user.email_verified ? 'Verified' : 'Unverified'}</TD>
                <TD style={cellStyle}>{isStudent ? getSubroleName(user.subrole) : adviserCodes[user._id]?.code || 'N/A'}</TD>
              </TR>
            ))}
          </Table>
        ) : (
          <View style={styles.noData}>
            <Text>No users found matching the current filters</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Total Records: {filteredUsers.length}
          {'\n'}
          {filters && Object.entries(filters)
            .filter(([key, value]) => {
              if (!value || value.toLowerCase() === 'all' || value === 'undefined') return false;
              if (key === 'subrole' && !isStudent) return false;
              return true;
            })
            .length > 0 && (
              'Filters: ' +
              Object.entries(filters)
                .filter(([key, value]) => {
                  if (!value || value.toLowerCase() === 'all' || value === 'undefined') return false;
                  if (key === 'subrole' && !isStudent) return false;
                  return true;
                })
                .map(([key, value]) => {
                  const capKey = key.charAt(0).toUpperCase() + key.slice(1);
                  const capValue = typeof value === 'string'
                    ? value.charAt(0).toUpperCase() + value.slice(1)
                    : value;
                  return `${capKey}: ${capValue}`;
                })
                .join(', ')
            )}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFReport; 