import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// =========================================
// User Queries
// =========================================
export const getStudentGroup = query({
  args: { 
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"studentsTable"> | null> => {
    try {
      const studentDoc = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .first();
      return studentDoc;
    } catch {
      return null;
    }
  },
});

export const getGroupById = query({
  args: { 
    groupId: v.id("groupsTable"),
  },
  handler: async (ctx, args) => {
    const { groupId } = args;
    try {
      const group = await ctx.db.get(groupId);
      return group; // This already includes requested_adviser if present
    } catch {
      return null;
    }
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id); // returns null if not found
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerkId))
      .first();
    return user; // will return null if not found
  },
});

export const getAdvisers = query({
  args: { 
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { pageSize = 5, pageNumber = 1 } = args;
    const skip = (pageNumber - 1) * pageSize;

    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 1))
      .order("desc")
      .collect()
      .then(results => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 1))
      .collect()
      .then(results => results.length);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  },
});

export const getStudents = query({
  args: { 
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { pageSize = 5, pageNumber = 1 } = args;
    const skip = (pageNumber - 1) * pageSize;

    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 0))
      .order("desc")
      .collect()
      .then(results => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 0))
      .collect()
      .then(results => results.length);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    return user;
  },
});

// Adviser Code Queries
interface AdviserCode {
  _id: string;
  adviser_id: string;
  code: string;
  group_ids?: Id<"groupsTable">[];
  requests_group_ids?: Id<"groupsTable">[];
}

export const getAdviserCodes = query({
  handler: async (ctx) => {
    const codes = await ctx.db
      .query("advisersTable")
      .collect();
    // Convert array to object with adviser_id as key
    return codes.reduce((acc, code) => {
      acc[code.adviser_id] = code;
      return acc;
    }, {} as Record<string, AdviserCode>);
  },
});

export const getAdviserCode = query({
  args: { adviserId: v.id("users") },
  handler: async (ctx, args) => {
    const code = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    return code;
  },
});

export const getAdviserByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const adviser = await ctx.db
      .query("advisersTable")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (!adviser) return null;
    // Also fetch the user details
    const user = await ctx.db.get(adviser.adviser_id);
    return {
      adviser,
      user,
    };
  },
});

export const getLogs = query({
  args: {
    searchTerm: v.string(),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
    actionFilter: v.optional(v.string()),
    entityTypeFilter: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, pageSize = 5, pageNumber = 1, sortField, sortDirection, actionFilter, entityTypeFilter, startDate, endDate } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Start with base query
      let logs = await ctx.db.query("instructorLogs").collect();

      // Apply search filters if searchTerm is provided
      if (searchTerm.trim()) {
        const searchTerms = searchTerm.toLowerCase().split(" ").filter(term => term.length > 0);
        
        logs = logs.filter(log => {
          const instructorName = `${log.instructor_first_name || ''} ${log.instructor_middle_name || ''} ${log.instructor_last_name || ''}`.toLowerCase();
          const affectedEntityName = `${log.affected_entity_first_name || ''} ${log.affected_entity_middle_name || ''} ${log.affected_entity_last_name || ''}`.toLowerCase();
          const instructorId = log.instructor_id.toString().toLowerCase();
          const affectedEntityId = log.affected_entity_id.toString().toLowerCase();

          return searchTerms.every(term =>
            instructorName.includes(term) ||
            affectedEntityName.includes(term) ||
            instructorId.includes(term) ||
            affectedEntityId.includes(term)
          );
        });
      }

      // Apply action filter
      if (actionFilter && actionFilter !== "All Actions") {
        logs = logs.filter(log => log.action === actionFilter);
      }

      // Apply entity type filter
      if (entityTypeFilter && entityTypeFilter !== "All Entities") {
        logs = logs.filter(log => log.affected_entity_type === entityTypeFilter);
      }

      // Apply date range filter
      if (startDate) {
        logs = logs.filter(log => log._creationTime >= startDate);
      }
      if (endDate) {
        logs = logs.filter(log => log._creationTime <= endDate);
      }

      // Sort the results
      if (sortField && sortDirection) {
        logs.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "_creationTime":
              comparison = a._creationTime - b._creationTime;
              break;
            case "instructor":
              const aInstructor = `${a.instructor_last_name || ''} ${a.instructor_first_name || ''}`;
              const bInstructor = `${b.instructor_last_name || ''} ${b.instructor_first_name || ''}`;
              comparison = aInstructor.localeCompare(bInstructor);
              break;
            case "affectedEntity":
              const aEntity = `${a.affected_entity_last_name || ''} ${a.affected_entity_first_name || ''}`;
              const bEntity = `${b.affected_entity_last_name || ''} ${b.affected_entity_first_name || ''}`;
              comparison = aEntity.localeCompare(bEntity);
              break;
            case "action":
              comparison = a.action.localeCompare(b.action);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Apply pagination
      const totalCount = logs.length;
      const paginatedResults = logs.slice(skip, skip + pageSize);

      return {
        logs: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status: 'idle',
        hasResults: paginatedResults.length > 0
      };
    } catch {
      return {
        logs: [],
        totalCount: 0,
        totalPages: 0,
        status: 'error',
        hasResults: false
      };
    }
  },
});

export const getGroups = query({
  args: { 
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { pageSize = 5, pageNumber = 1 } = args;
    const skip = (pageNumber - 1) * pageSize;

    const groups = await ctx.db
      .query("groupsTable")
      .collect()
      .then(results => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("groupsTable")
      .collect()
      .then(results => results.length);

    return {
      groups,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();
    return users;
  },
});

export const getPendingGroupIdsForAdviser = query({
  args: { 
    adviserId: v.id("users"),
    searchTerm: v.string(),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adviserId, searchTerm, pageSize = 5, pageNumber = 1, sortField, sortDirection } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Get the adviser's pending group IDs
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", adviserId))
        .first();

      if (!adviser?.requests_group_ids) {
        return {
          groups: [],
          totalCount: 0,
          totalPages: 0,
          status: 'idle',
          hasResults: false
        };
      }

      // Get all groups and users for processing
      const groups = await ctx.db.query("groupsTable").collect();
      const users = await ctx.db.query("users").collect();

      // Filter groups to only include pending ones
      let filteredGroups = groups.filter(group => 
        adviser.requests_group_ids?.includes(group._id)
      );

      // Apply search if searchTerm is provided
      if (searchTerm.trim()) {
        const searchTerms = searchTerm.toLowerCase().split(" ").filter(term => term.length > 0);
        
        filteredGroups = filteredGroups.filter(group => {
          const projectManager = group.project_manager_id ? users.find(u => u._id === group.project_manager_id) : null;
          const groupName = projectManager ? `${projectManager.last_name} et al`.toLowerCase() : "";
          const capstoneTitle = (group.capstone_title || "").toLowerCase();
          const members = group.member_ids
            .map(id => users.find(u => u._id === id))
            .filter((u): u is NonNullable<typeof u> => u !== undefined);

          const memberNames = members.map(m => 
            `${m.first_name} ${m.last_name}`.toLowerCase()
          ).join(" ");

          return searchTerms.every(term =>
            groupName.includes(term) ||
            capstoneTitle.includes(term) ||
            memberNames.includes(term)
          );
        });
      }

      // Apply sorting
      if (sortField && sortDirection) {
        filteredGroups.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "name":
              const aManager = a.project_manager_id ? users.find(u => u._id === a.project_manager_id) : null;
              const bManager = b.project_manager_id ? users.find(u => u._id === b.project_manager_id) : null;
              const aName = aManager ? `${aManager.last_name} et al` : "";
              const bName = bManager ? `${bManager.last_name} et al` : "";
              comparison = aName.localeCompare(bName);
              break;
            case "capstoneTitle":
              comparison = (a.capstone_title || "").localeCompare(b.capstone_title || "");
              break;
            case "projectManager":
              const aPM = a.project_manager_id ? users.find(u => u._id === a.project_manager_id) : null;
              const bPM = b.project_manager_id ? users.find(u => u._id === b.project_manager_id) : null;
              const aPMName = aPM ? `${aPM.last_name} ${aPM.first_name}` : "";
              const bPMName = bPM ? `${bPM.last_name} ${bPM.first_name}` : "";
              comparison = aPMName.localeCompare(bPMName);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Process groups to include user information
      const processedGroups = filteredGroups.map(group => {
        const projectManager = group.project_manager_id ? users.find(u => u._id === group.project_manager_id) : null;
        return {
          ...group,
          name: projectManager ? `${projectManager.last_name} et al` : "Unknown Group",
          projectManager,
          members: group.member_ids
            .map(id => users.find(u => u._id === id))
            .filter((u): u is NonNullable<typeof u> => u !== undefined),
        };
      });

      // Apply pagination
      const totalCount = processedGroups.length;
      const paginatedResults = processedGroups.slice(skip, skip + pageSize);

      return {
        groups: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status: 'idle',
        hasResults: paginatedResults.length > 0
      };
    } catch {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: 'error',
        hasResults: false
      };
    }
  },
});

export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    role: v.number(),
    emailVerified: v.optional(v.boolean()),
    subrole: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const { searchTerm, role, emailVerified, subrole, pageSize = 5, pageNumber = 1, sortField, sortDirection } = args;
      const skip = (pageNumber - 1) * pageSize;

      // If search term is empty, use a regular query instead of search
      let results;
      if (!searchTerm.trim()) {
        results = await ctx.db
          .query("users")
          .filter((q) => {
            const roleFilter = q.eq(q.field("role"), role);
            const emailVerifiedFilter = emailVerified !== undefined 
              ? q.eq(q.field("email_verified"), emailVerified)
              : null;
            const subroleFilter = subrole !== undefined
              ? q.eq(q.field("subrole"), subrole)
              : null;

            // Combine all filters
            let finalFilter = roleFilter;
            if (emailVerifiedFilter) {
              finalFilter = q.and(finalFilter, emailVerifiedFilter);
            }
            if (subroleFilter) {
              finalFilter = q.and(finalFilter, subroleFilter);
            }
            return finalFilter;
          })
          .collect();
      } else {
      // Search in both first name and last name
      const firstNameResults = await ctx.db
        .query("users")
        .withSearchIndex("search_by_first_name", (q) => {
          let searchQuery = q.search("first_name", searchTerm);
            if (emailVerified !== undefined) {
              searchQuery = searchQuery.eq("email_verified", emailVerified);
            }
            if (subrole !== undefined) {
              searchQuery = searchQuery.eq("subrole", subrole);
            }
          return searchQuery.eq("role", role);
        })
          .collect();

      const lastNameResults = await ctx.db
        .query("users")
        .withSearchIndex("search_by_last_name", (q) => {
          let searchQuery = q.search("last_name", searchTerm);
            if (emailVerified !== undefined) {
              searchQuery = searchQuery.eq("email_verified", emailVerified);
            }
            if (subrole !== undefined) {
              searchQuery = searchQuery.eq("subrole", subrole);
            }
          return searchQuery.eq("role", role);
        })
          .collect();

      // Combine and deduplicate results
        results = [...firstNameResults, ...lastNameResults].filter((user, index, self) =>
          index === self.findIndex((u) => u._id === user._id)
        );
      }

      // Get total count
      const totalCount = results.length;

      // Apply sorting if specified
      if (sortField && sortDirection) {
        results.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "_creationTime":
              comparison = a._creationTime - b._creationTime;
              break;
            case "first_name":
              comparison = a.first_name.localeCompare(b.first_name);
              break;
            case "last_name":
              comparison = a.last_name.localeCompare(b.last_name);
              break;
            case "email":
              comparison = a.email.localeCompare(b.email);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Apply pagination
      const paginatedResults = results.slice(skip, skip + pageSize);

      // Simplify status to just loading or idle
      const status = 'idle';

      return {
        users: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status,
        hasResults: paginatedResults.length > 0
      };
    } catch {
      return {
        users: [],
        totalCount: 0,
        totalPages: 0,
        status: 'error',
        hasResults: false
      };
    }
  },
});

export const searchGroups = query({
  args: {
    searchTerm: v.string(),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
    capstoneFilter: v.optional(v.string()),
    adviserFilter: v.optional(v.string()),
    gradeFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, pageSize = 5, pageNumber = 1, sortField, sortDirection, capstoneFilter, adviserFilter, gradeFilter } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Get all users for name lookups
      const users = await ctx.db.query("users").collect();

      // Start with base query
      let groups = await ctx.db.query("groupsTable").collect();

      // Apply search filters if searchTerm is provided
      if (searchTerm.trim()) {
        const searchTerms = searchTerm.toLowerCase().split(" ").filter(term => term.length > 0);
        
        groups = groups.filter(group => {
          const projectManager = group.project_manager_id ? users.find(u => u._id === group.project_manager_id) : null;
          const groupName = projectManager ? `${projectManager.last_name} et al`.toLowerCase() : "";
          const capstoneTitle = (group.capstone_title || "").toLowerCase();
          const adviser = group.adviser_id ? users.find(u => u._id === group.adviser_id) : null;
          const members = group.member_ids
            .map(id => users.find(u => u._id === id))
            .filter((u): u is NonNullable<typeof u> => u !== undefined);

          const projectManagerName = projectManager ? `${projectManager.first_name} ${projectManager.last_name}`.toLowerCase() : "";
          const adviserName = adviser ? `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + ' ' : ''}${adviser.last_name}`.toLowerCase() : "";
          const memberNames = members.map(m => `${m.first_name} ${m.last_name}`.toLowerCase());

          return searchTerms.every(term =>
            groupName.includes(term) ||
            capstoneTitle.includes(term) ||
            projectManagerName.includes(term) ||
            adviserName.includes(term) ||
            memberNames.some(name => name.includes(term))
          );
        });
      }

      // Apply capstone filter
      if (capstoneFilter && capstoneFilter !== "All Capstone Titles") {
        groups = groups.filter(group => {
          if (capstoneFilter === "With Capstone Title") {
            return !!group.capstone_title;
          } else if (capstoneFilter === "Without Capstone Title") {
            return !group.capstone_title;
          }
          // Match specific capstone title (case-insensitive)
          return (group.capstone_title || "").toLowerCase() === capstoneFilter.toLowerCase();
        });
      }

      // Apply adviser filter
      if (adviserFilter && adviserFilter !== "All Advisers") {
        groups = groups.filter(group => {
          const adviser = group.adviser_id ? users.find(u => u._id === group.adviser_id) : null;
          if (adviserFilter === "No Adviser") {
            return !adviser;
          }
          const adviserName = adviser
            ? `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + ' ' : ''}${adviser.last_name}`.toLowerCase()
            : "";
          return adviserName === adviserFilter.toLowerCase();
        });
      }

      // Grade label to number mapping
      const GRADE_LABEL_TO_NUMBER: { [key: string]: number } = {
        "No Grade": 0,
        "Approved": 1,
        "Approved With Revisions": 2,
        "Disapproved": 3,
        "Accepted With Revisions": 4,
        "Reoral Defense": 5,
        "Not Accepted": 6,
      };

      // Apply grade filter
      if (gradeFilter && gradeFilter.toLowerCase() !== "all grades") {
        groups = groups.filter(group => {
          const grade = group.grade;
          if (gradeFilter.toLowerCase() === "no grade") {
            return grade === undefined || grade === null || grade === 0;
          }
          const gradeNumber = GRADE_LABEL_TO_NUMBER[gradeFilter];
          return grade === gradeNumber;
        });
      }

      // Sort the results
      if (sortField && sortDirection) {
        groups.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "name":
              const aManager = a.project_manager_id ? users.find(u => u._id === a.project_manager_id) : null;
              const bManager = b.project_manager_id ? users.find(u => u._id === b.project_manager_id) : null;
              const aName = aManager ? `${aManager.last_name} et al` : "";
              const bName = bManager ? `${bManager.last_name} et al` : "";
              comparison = aName.localeCompare(bName);
              break;
            case "capstoneTitle":
              comparison = (a.capstone_title || "").localeCompare(b.capstone_title || "");
              break;
            case "projectManager":
              const aPM = a.project_manager_id ? users.find(u => u._id === a.project_manager_id) : null;
              const bPM = b.project_manager_id ? users.find(u => u._id === b.project_manager_id) : null;
              const aPMName = aPM ? `${aPM.last_name} ${aPM.first_name}` : "";
              const bPMName = bPM ? `${bPM.last_name} ${bPM.first_name}` : "";
              comparison = aPMName.localeCompare(bPMName);
              break;
            case "grade":
              comparison = (a.grade || 0) - (b.grade || 0);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Process groups to include user information
      const processedGroups = groups.map(group => {
        const projectManager = group.project_manager_id ? users.find(u => u._id === group.project_manager_id) : null;
        return {
          ...group,
          name: projectManager ? `${projectManager.last_name} et al` : "Unknown Group",
          projectManager,
          adviser: group.adviser_id ? users.find(u => u._id === group.adviser_id) : undefined,
          members: group.member_ids
            .map(id => users.find(u => u._id === id))
            .filter((u): u is NonNullable<typeof u> => u !== undefined),
        };
      });

      // Apply pagination
      const totalCount = processedGroups.length;
      const paginatedResults = processedGroups.slice(skip, skip + pageSize);

      return {
        groups: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status: 'idle',
        hasResults: paginatedResults.length > 0
      };
    } catch {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: 'error',
        hasResults: false
      };
    }
  },
}); 

interface DocumentWithStatus {
    _id: Id<"documents">;
    _creationTime: number;
    group_id: Id<"groupsTable">;
    chapter: string;
    room_id: string;
    title: string;
    content: string;
    student_ids: Id<"users">[];
    status: number; // This now represents review_status from documentStatus table
    last_modified?: number; // This comes from documentStatus.last_modified
}

export const getLatestDocuments = query({
    args: {
        groupId: v.id("groupsTable"),
    },
    handler: async (ctx, args) => {
        const { groupId } = args;

        // Define the order of document chapters
        const CHAPTER_ORDER = [
            "title_page",
            "acknowledgment",
            "abstract",
            "table_of_contents",
            "chapter_1",
            "chapter_2",
            "chapter_3",
            "chapter_4",
            "chapter_5",
            "references",
            "appendix_a",
            "appendix_b",
            "appendix_c",
            "appendix_d",
            "appendix_e",
            "appendix_f",
            "appendix_g",
            "appendix_h",
            "appendix_i",
        ];

        try {
            // Get the group to access member information
            const group = await ctx.db.get(groupId);
            if (!group) {
                return { documents: [], done: true };
            }

            const allStudentIds = [group.project_manager_id, ...group.member_ids];

            // 1. Fetch all documents for the group
            const allDocs = await ctx.db
                .query("documents")
                .withIndex("by_group_chapter", (q) => q.eq("group_id", groupId))
                .collect();

            // 2. Fetch all review statuses for the group
            const allStatuses = await ctx.db
                .query("documentStatus")
                .withIndex("by_group_document", (q) => q.eq("group_id", groupId))
                .collect();

            // Create a map for quick status lookup
            const statusMap = new Map(allStatuses.map(s => [s.document_part, s]));

            // 3. Get the latest version of each document part
            const latestDocsMap = new Map<string, Doc<"documents">>();
            for (const doc of allDocs) {
                const existing = latestDocsMap.get(doc.chapter);
                if (!existing || doc._creationTime > existing._creationTime) {
                    latestDocsMap.set(doc.chapter, doc);
                }
            }

            // 4. Combine documents with their review status
            const documentsWithStatus: DocumentWithStatus[] = Array.from(latestDocsMap.values()).map(doc => {
                const statusInfo = statusMap.get(doc.chapter);
                return {
                    ...doc,
                    student_ids: allStudentIds, // Attach the student IDs
                    status: statusInfo?.review_status ?? 0, // Default to 0 (Not Submitted)
                    last_modified: statusInfo?.last_modified,
                };
            });

            // 5. Sort the documents according to CHAPTER_ORDER
            documentsWithStatus.sort((a, b) => {
                const indexA = CHAPTER_ORDER.indexOf(a.chapter);
                const indexB = CHAPTER_ORDER.indexOf(b.chapter);
                
                // Handle cases where a chapter might not be in the order array
                if (indexA === -1 && indexB === -1) return a.chapter.localeCompare(b.chapter);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                
                return indexA - indexB;
            });

            return { documents: documentsWithStatus, done: true };
        } catch {
            return {
                documents: [],
                status: 'error',
                hasResults: false,
                done: true
            };
        }
    },
});

// =========================================
// Task Assignment Queries
// =========================================

export const getTaskAssignments = query({
    args: {
        groupId: v.id("groupsTable"),
    },
    handler: async (ctx, args) => {
        const { groupId } = args;

        try {
            // Get the group to access member information
            const group = await ctx.db.get(groupId);
            if (!group) {
                return {
                    tasks: [],
                    groupMembers: [],
                    status: 'error',
                    hasResults: false
                };
            }

            // Get all task assignments for the group
            const taskAssignments = await ctx.db
                .query("taskAssignments")
                .withIndex("by_group", (q) => q.eq("group_id", groupId))
                .collect();

            // Get all users for name lookups
            const users = await ctx.db.query("users").collect();

            // Get group members (project manager + members)
            const allMemberIds = [group.project_manager_id, ...group.member_ids];
            const groupMembers = allMemberIds
                .map(id => users.find(u => u._id === id))
                .filter((u): u is NonNullable<typeof u> => u !== undefined)
                .map(user => ({
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    isProjectManager: user._id === group.project_manager_id
                }));

            // Enhance task assignments with user information
            const enhancedTasks = taskAssignments.map(task => {
                const assignedUsers = task.assigned_student_ids
                    .map(id => users.find(u => u._id === id))
                    .filter((u): u is NonNullable<typeof u> => u !== undefined)
                    .map(user => ({
                        _id: user._id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email
                    }));

                return {
                    ...task,
                    assignedUsers
                };
            });

            return {
                tasks: enhancedTasks,
                groupMembers,
                status: 'idle',
                hasResults: enhancedTasks.length > 0
            };
        } catch {
            return {
                tasks: [],
                groupMembers: [],
                status: 'error',
                hasResults: false
            };
        }
    },
});

export const getGroupMembersForTaskAssignment = query({
    args: {
        groupId: v.id("groupsTable"),
    },
    handler: async (ctx, args) => {
        const { groupId } = args;

        try {
            // Get the group to access member information
            const group = await ctx.db.get(groupId);
            if (!group) {
                return {
                    groupMembers: [],
                    status: 'error',
                    hasResults: false
                };
            }

            // Get all users for name lookups
            const users = await ctx.db.query("users").collect();

            // Get group members (project manager + members)
            const allMemberIds = [group.project_manager_id, ...group.member_ids];
            const groupMembers = allMemberIds
                .map(id => users.find(u => u._id === id))
                .filter((u): u is NonNullable<typeof u> => u !== undefined)
                .map(user => ({
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    isProjectManager: user._id === group.project_manager_id
                }));

            return {
                groupMembers,
                status: 'idle',
                hasResults: groupMembers.length > 0
            };
        } catch {
            return {
                groupMembers: [],
                status: 'error',
                hasResults: false
            };
        }
    },
});

export const getTaskAssignmentsByChapter = query({
    args: {
        groupId: v.id("groupsTable"),
        chapter: v.string(),
    },
    handler: async (ctx, args) => {
        const { groupId, chapter } = args;

        try {
            // Get the group to access member information
            const group = await ctx.db.get(groupId);
            if (!group) {
                return {
                    tasks: [],
                    groupMembers: [],
                    status: 'error',
                    hasResults: false
                };
            }

            // Get task assignments for specific chapter
            const taskAssignments = await ctx.db
                .query("taskAssignments")
                .withIndex("by_group_chapter", (q) => 
                    q.eq("group_id", groupId).eq("chapter", chapter)
                )
                .collect();

            // Get all users for name lookups
            const users = await ctx.db.query("users").collect();

            // Get group members (project manager + members)
            const allMemberIds = [group.project_manager_id, ...group.member_ids];
            const groupMembers = allMemberIds
                .map(id => users.find(u => u._id === id))
                .filter((u): u is NonNullable<typeof u> => u !== undefined)
                .map(user => ({
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    isProjectManager: user._id === group.project_manager_id
                }));

            // Enhance task assignments with user information
            const enhancedTasks = taskAssignments.map(task => {
                const assignedUsers = task.assigned_student_ids
                    .map(id => users.find(u => u._id === id))
                    .filter((u): u is NonNullable<typeof u> => u !== undefined)
                    .map(user => ({
                        _id: user._id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email
                    }));

                return {
                    ...task,
                    assignedUsers
                };
            });

            return {
                tasks: enhancedTasks,
                groupMembers,
                status: 'idle',
                hasResults: enhancedTasks.length > 0
            };
        } catch {
            return {
                tasks: [],
                groupMembers: [],
                status: 'error',
                hasResults: false
            };
        }
    },
});

export const getTaskAssignmentsByStatus = query({
    args: {
        groupId: v.id("groupsTable"),
        taskStatus: v.number(), // 0 = incomplete, 1 = completed
    },
    handler: async (ctx, args) => {
        const { groupId, taskStatus } = args;

        try {
            // Get the group to access member information
            const group = await ctx.db.get(groupId);
            if (!group) {
                return {
                    tasks: [],
                    groupMembers: [],
                    status: 'error',
                    hasResults: false
                };
            }

            // Get task assignments by status
            const taskAssignments = await ctx.db
                .query("taskAssignments")
                .withIndex("by_group_task_status", (q) => 
                    q.eq("group_id", groupId).eq("task_status", taskStatus)
                )
                .collect();

            // Get all users for name lookups
            const users = await ctx.db.query("users").collect();

            // Get group members (project manager + members)
            const allMemberIds = [group.project_manager_id, ...group.member_ids];
            const groupMembers = allMemberIds
                .map(id => users.find(u => u._id === id))
                .filter((u): u is NonNullable<typeof u> => u !== undefined)
                .map(user => ({
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    isProjectManager: user._id === group.project_manager_id
                }));

            // Enhance task assignments with user information
            const enhancedTasks = taskAssignments.map(task => {
                const assignedUsers = task.assigned_student_ids
                    .map(id => users.find(u => u._id === id))
                    .filter((u): u is NonNullable<typeof u> => u !== undefined)
                    .map(user => ({
                        _id: user._id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email
                    }));

                return {
                    ...task,
                    assignedUsers
                };
            });

            return {
                tasks: enhancedTasks,
                groupMembers,
                status: 'idle',
                hasResults: enhancedTasks.length > 0
            };
        } catch {
            return {
                tasks: [],
                groupMembers: [],
                status: 'error',
                hasResults: false
            };
        }
    },
});

// =========================================
// Document Status Queries
// =========================================

export const getDocumentStatuses = query({
    args: {
        groupId: v.id("groupsTable"),
    },
    handler: async (ctx, args) => {
        const { groupId } = args;

        try {
            // Get all document statuses for the group
            const documentStatuses = await ctx.db
                .query("documentStatus")
                .withIndex("by_group", (q) => q.eq("group_id", groupId))
                .collect();

            return {
                documentStatuses,
                status: 'idle',
                hasResults: documentStatuses.length > 0
            };
        } catch {
            return {
                documentStatuses: [],
                status: 'error',
                hasResults: false
            };
        }
    },
});

export const getDocumentStatusByPart = query({
    args: {
        groupId: v.id("groupsTable"),
        documentPart: v.string(),
    },
    handler: async (ctx, args) => {
        const { groupId, documentPart } = args;

        try {
            // Get document status for specific part
            const documentStatus = await ctx.db
                .query("documentStatus")
                .withIndex("by_group_document", (q) => 
                    q.eq("group_id", groupId).eq("document_part", documentPart)
                )
                .first();

            return {
                documentStatus,
                status: 'idle',
                hasResults: !!documentStatus
            };
        } catch {
            return {
                documentStatus: null,
                status: 'error',
                hasResults: false
            };
        }
    },
}); 