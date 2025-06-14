import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// =========================================
// User Queries
// =========================================
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
    pageSize: v.number(),
    pageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { pageSize, pageNumber } = args;
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
    pageSize: v.number(),
    pageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { pageSize, pageNumber } = args;
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

export const getLogs = query({
  args: {
    searchTerm: v.string(),
    pageSize: v.number(),
    pageNumber: v.number(),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
    actionFilter: v.optional(v.string()),
    entityTypeFilter: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, pageSize, pageNumber, sortField, sortDirection, actionFilter, entityTypeFilter, startDate, endDate } = args;
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
  handler: async (ctx) => {
    const groups = await ctx.db
      .query("groupsTable")
      .collect();
    return groups;
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
    pageSize: v.number(),
    pageNumber: v.number(),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adviserId, searchTerm, pageSize, pageNumber, sortField, sortDirection } = args;
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
    pageSize: v.number(),
    pageNumber: v.number(),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const { searchTerm, role, emailVerified, subrole, pageSize, pageNumber, sortField, sortDirection } = args;
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
    pageSize: v.number(),
    pageNumber: v.number(),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
    capstoneFilter: v.optional(v.string()),
    adviserFilter: v.optional(v.string()),
    gradeFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, pageSize, pageNumber, sortField, sortDirection, capstoneFilter, adviserFilter, gradeFilter } = args;
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
          const adviserName = adviser ? `${adviser.first_name} ${adviser.last_name}`.toLowerCase() : "";
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
          return true;
        });
      }

      // Apply adviser filter
      if (adviserFilter && adviserFilter !== "All Advisers") {
        groups = groups.filter(group => {
          const adviser = group.adviser_id ? users.find(u => u._id === group.adviser_id) : null;
          if (adviserFilter === "No Adviser") {
            return !adviser;
          }
          const adviserName = adviser ? `${adviser.first_name} ${adviser.last_name}` : "";
          return adviserName === adviserFilter;
        });
      }

      // Apply grade filter
      if (gradeFilter && gradeFilter !== "All Grades") {
        groups = groups.filter(group => {
          const grade = group.grade;
          if (gradeFilter === "No Grade") {
            return grade === undefined || grade === null;
          }
          return grade === parseInt(gradeFilter);
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