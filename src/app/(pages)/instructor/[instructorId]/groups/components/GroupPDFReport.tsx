import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Table, TH, TR, TD } from '@ag-media/react-pdf-table';
import { Group, User } from './types';

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

const cellStyle = { fontSize: 10, padding: 4, wordBreak: 'keep-all', whiteSpace: 'nowrap' };

function getFullName(user?: User) {
  if (!user) return '-';
  return `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`;
}

function getGradeText(grade?: number) {
  switch (grade) {
    case 0:
      return 'No grade';
    case 1:
      return 'Approved';
    case 2:
      return 'Approved With Revisions';
    case 3:
      return 'Disapproved';
    case 4:
      return 'Accepted With Revisions';
    case 5:
      return 'Reoral Defense';
    case 6:
      return 'Not Accepted';
    default:
      return 'No grade';
  }
}

interface GroupPDFReportProps {
  groups: Group[];
  title: string;
  filters?: {
    searchTerm?: string;
    capstoneFilter?: string;
    adviserFilter?: string;
    gradeFilter?: string;
  };
}

const GroupPDFReport: React.FC<GroupPDFReportProps> = ({ groups = [], title, filters }) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Groups Report'}</Text>
          <Text style={styles.subtitle}>Generated on {currentDate}</Text>
        </View>

        {groups.length > 0 ? (
          <Table weightings={[1.2, 1.2, 1.2, 2, 1.2, 0.8]}>
            <TH>
              <TD style={cellStyle}>Group Name</TD>
              <TD style={cellStyle}>Capstone Title</TD>
              <TD style={cellStyle}>Project Manager</TD>
              <TD style={cellStyle}>Members</TD>
              <TD style={cellStyle}>Adviser</TD>
              <TD style={cellStyle}>Grade</TD>
            </TH>
            {groups.map((group) => (
              <TR key={group._id}>
                <TD style={cellStyle}>{group.name || '-'}</TD>
                <TD style={cellStyle}>{group.capstone_title || '-'}</TD>
                <TD style={cellStyle}>{getFullName(group.projectManager)}</TD>
                <TD style={cellStyle}>{group.members && group.members.length > 0 ? group.members.map(getFullName).join(', ') : '-'}</TD>
                <TD style={cellStyle}>{getFullName(group.adviser)}</TD>
                <TD style={cellStyle}>{getGradeText(group.grade)}</TD>
              </TR>
            ))}
          </Table>
        ) : (
          <View style={styles.noData}>
            <Text>No groups found</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Total Records: {groups.length}
          {'\n'}
          {filters && Object.entries(filters)
            .filter(([, value]) => value && value.toLowerCase() !== 'all' && value !== 'undefined')
            .length > 0 && (
              'Filters: ' +
              Object.entries(filters)
                .filter(([, value]) => value && value.toLowerCase() !== 'all' && value !== 'undefined')
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

export default GroupPDFReport; 