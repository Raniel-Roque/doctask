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
      .then((results) => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 1))
      .collect()
      .then((results) => results.length);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
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
      .then((results) => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 0))
      .collect()
      .then((results) => results.length);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
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
    const codes = await ctx.db.query("advisersTable").collect();
    // Convert array to object with adviser_id as key
    return codes.reduce(
      (acc, code) => {
        acc[code.adviser_id] = code;
        return acc;
      },
      {} as Record<string, AdviserCode>,
    );
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
    actionFilters: v.optional(v.array(v.string())),
    entityTypeFilter: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    userRole: v.optional(v.number()), // 0 = instructor, 1 = adviser
    specificUserId: v.optional(v.id("users")), // Filter by specific user ID
  },
  handler: async (ctx, args) => {
    const {
      searchTerm,
      pageSize = 5,
      pageNumber = 1,
      sortField,
      sortDirection,
      actionFilters,
      entityTypeFilter,
      startDate,
      endDate,
      userRole = 0, // Default to instructor logs
      specificUserId, // Optional specific user ID filter
    } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Start with base query and filter by user role
      let logs = await ctx.db
        .query("LogsTable")
        .withIndex("by_user_role", (q) => q.eq("user_role", userRole))
        .collect();

      // Apply specific user ID filter if provided
      if (specificUserId) {
        logs = logs.filter((log) => log.user_id === specificUserId);
      }

      // Apply search filters if searchTerm is provided
      if (searchTerm.trim()) {
        const searchTerms = searchTerm
          .toLowerCase()
          .split(" ")
          .filter((term) => term.length > 0);

        logs = logs.filter((log) => {
          const userName =
            `${log.user_first_name || ""} ${log.user_middle_name || ""} ${log.user_last_name || ""}`.toLowerCase();
          const affectedEntityName =
            `${log.affected_entity_first_name || ""} ${log.affected_entity_middle_name || ""} ${log.affected_entity_last_name || ""}`.toLowerCase();
          const userId = log.user_id.toString().toLowerCase();
          const affectedEntityId = log.affected_entity_id
            .toString()
            .toLowerCase();

          return searchTerms.every(
            (term) =>
              userName.includes(term) ||
              affectedEntityName.includes(term) ||
              userId.includes(term) ||
              affectedEntityId.includes(term),
          );
        });
      }

      // Apply action filter
      if (actionFilters && actionFilters.length > 0) {
        logs = logs.filter((log) => {
          // Map the detailed actions to their consolidated versions
          const consolidatedAction = 
            log.action === "Create User" || log.action === "Create Group" ? "Create" :
            log.action === "Edit User" || log.action === "Edit Group" ? "Edit" :
            log.action === "Delete User" || log.action === "Delete Group" ? "Delete" :
            log.action === "Reset Password" ? "Reset Password" :
            log.action === "Lock Account" ? "Lock Account" :
            log.action === "Unlock Account" ? "Unlock Account" :
            log.action;
          
          return actionFilters.includes(consolidatedAction);
        });
      }

      // Apply entity type filter
      if (entityTypeFilter && entityTypeFilter !== "All Entities") {
        logs = logs.filter(
          (log) => log.affected_entity_type === entityTypeFilter,
        );
      }

      // Apply date range filter
      if (startDate) {
        logs = logs.filter((log) => log._creationTime >= startDate);
      }
      if (endDate) {
        logs = logs.filter((log) => log._creationTime <= endDate);
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
            case "user":
              const aUser = `${a.user_last_name || ""} ${a.user_first_name || ""}`;
              const bUser = `${b.user_last_name || ""} ${b.user_first_name || ""}`;
              comparison = aUser.localeCompare(bUser);
              break;
            case "affectedEntity":
              const aEntity = `${a.affected_entity_last_name || ""} ${a.affected_entity_first_name || ""}`;
              const bEntity = `${b.affected_entity_last_name || ""} ${b.affected_entity_first_name || ""}`;
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
        status: "idle",
        hasResults: paginatedResults.length > 0,
      };
    } catch {
      return {
        logs: [],
        totalCount: 0,
        totalPages: 0,
        status: "error",
        hasResults: false,
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
      .then((results) => results.slice(skip, skip + pageSize));

    const totalCount = await ctx.db
      .query("groupsTable")
      .collect()
      .then((results) => results.length);

    return {
      groups,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
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
    const {
      adviserId,
      searchTerm,
      pageSize = 5,
      pageNumber = 1,
      sortField,
      sortDirection,
    } = args;
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
          status: "idle",
          hasResults: false,
        };
      }

      // Get all groups and users for processing
      const groups = await ctx.db.query("groupsTable").collect();
      const users = await ctx.db.query("users").collect();

      // Filter groups to only include pending ones
      let filteredGroups = groups.filter((group) =>
        adviser.requests_group_ids?.includes(group._id),
      );

      // Apply search if searchTerm is provided
      if (searchTerm.trim()) {
        // Use Convex search functionality for capstone titles
        const capstoneResults = await ctx.db
          .query("groupsTable")
          .withSearchIndex("search_by_capstone_title", (q) =>
            q.search("capstone_title", searchTerm),
          )
          .collect();

        // Filter capstone results to only include groups assigned to this adviser
        const capstoneFiltered = capstoneResults.filter((group) =>
          adviser.group_ids?.includes(group._id),
        );

        // Also search by project manager names
        const allGroups = await ctx.db.query("groupsTable").collect();
        const users = await ctx.db.query("users").collect();

        const managerFiltered = allGroups.filter((group) => {
          if (!adviser.group_ids?.includes(group._id)) return false;

          const projectManager = group.project_manager_id
            ? users.find((u) => u._id === group.project_manager_id)
            : null;
          if (!projectManager) return false;

          const managerName =
            `${projectManager.first_name} ${projectManager.last_name}`.toLowerCase();
          const groupName = `${projectManager.last_name} et al`.toLowerCase();

          return (
            managerName.includes(searchTerm.toLowerCase()) ||
            groupName.includes(searchTerm.toLowerCase())
          );
        });

        // Combine and deduplicate results
        const combinedResults = [...capstoneFiltered, ...managerFiltered];
        filteredGroups = combinedResults.filter(
          (group, index, self) =>
            index === self.findIndex((g) => g._id === group._id),
        );
      }

      // Apply sorting
      if (sortField && sortDirection) {
        filteredGroups.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "name":
              const aManager = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bManager = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
              const aName = aManager ? `${aManager.last_name} et al` : "";
              const bName = bManager ? `${bManager.last_name} et al` : "";
              comparison = aName.localeCompare(bName);
              break;
            case "capstoneTitle":
              comparison = (a.capstone_title || "").localeCompare(
                b.capstone_title || "",
              );
              break;
            case "projectManager":
              const aPM = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bPM = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
              const aPMName = aPM ? `${aPM.last_name} ${aPM.first_name}` : "";
              const bPMName = bPM ? `${bPM.last_name} ${bPM.first_name}` : "";
              comparison = aPMName.localeCompare(bPMName);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Process groups to include user information
      const processedGroups = filteredGroups.map((group) => {
        const projectManager = group.project_manager_id
          ? users.find((u) => u._id === group.project_manager_id)
          : null;
        return {
          ...group,
          name: projectManager
            ? `${projectManager.last_name} et al`
            : "Unknown Group",
          projectManager,
          members: group.member_ids
            .map((id) => users.find((u) => u._id === id))
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
        status: "idle",
        hasResults: paginatedResults.length > 0,
      };
    } catch {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: "error",
        hasResults: false,
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
      const {
        searchTerm,
        role,
        emailVerified,
        subrole,
        pageSize = 5,
        pageNumber = 1,
        sortField,
        sortDirection,
      } = args;
      const skip = (pageNumber - 1) * pageSize;

      // If search term is empty, use a regular query instead of search
      let results;
      if (!searchTerm.trim()) {
        results = await ctx.db
          .query("users")
          .filter((q) => {
            const roleFilter = q.eq(q.field("role"), role);
            const emailVerifiedFilter =
              emailVerified !== undefined
                ? q.eq(q.field("email_verified"), emailVerified)
                : null;
            const subroleFilter =
              subrole !== undefined ? q.eq(q.field("subrole"), subrole) : null;

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
        results = [...firstNameResults, ...lastNameResults].filter(
          (user, index, self) =>
            index === self.findIndex((u) => u._id === user._id),
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
      const status = "idle";

      return {
        users: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status,
        hasResults: paginatedResults.length > 0,
      };
    } catch {
      return {
        users: [],
        totalCount: 0,
        totalPages: 0,
        status: "error",
        hasResults: false,
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
    adviserFilters: v.optional(v.array(v.string())),
    gradeFilters: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const {
      searchTerm,
      pageSize = 5,
      pageNumber = 1,
      sortField,
      sortDirection,
      capstoneFilter,
      adviserFilters,
      gradeFilters,
    } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Get all users for name lookups
      const users = await ctx.db.query("users").collect();

      // Start with base query
      let groups = await ctx.db.query("groupsTable").collect();

      // Apply search filters if searchTerm is provided
      if (searchTerm.trim()) {
        const searchTerms = searchTerm
          .toLowerCase()
          .split(" ")
          .filter((term) => term.length > 0);

        groups = groups.filter((group) => {
          const projectManager = group.project_manager_id
            ? users.find((u) => u._id === group.project_manager_id)
            : null;
          const groupName = projectManager
            ? `${projectManager.last_name} et al`.toLowerCase()
            : "";
          const capstoneTitle = (group.capstone_title || "").toLowerCase();
          const adviser = group.adviser_id
            ? users.find((u) => u._id === group.adviser_id)
            : null;
          const members = group.member_ids
            .map((id) => users.find((u) => u._id === id))
            .filter((u): u is NonNullable<typeof u> => u !== undefined);

          const projectManagerName = projectManager
            ? `${projectManager.first_name} ${projectManager.last_name}`.toLowerCase()
            : "";
          const adviserName = adviser
            ? `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`.toLowerCase()
            : "";
          const memberNames = members.map((m) =>
            `${m.first_name} ${m.last_name}`.toLowerCase(),
          );

          return searchTerms.every(
            (term) =>
              groupName.includes(term) ||
              capstoneTitle.includes(term) ||
              projectManagerName.includes(term) ||
              adviserName.includes(term) ||
              memberNames.some((name) => name.includes(term)),
          );
        });
      }

      // Apply capstone filter
      if (capstoneFilter && capstoneFilter !== "All Capstone Titles") {
        groups = groups.filter((group) => {
          if (capstoneFilter === "With Capstone Title") {
            return !!group.capstone_title;
          } else if (capstoneFilter === "Without Capstone Title") {
            return !group.capstone_title;
          }
          // Match specific capstone title (case-insensitive)
          return (
            (group.capstone_title || "").toLowerCase() ===
            capstoneFilter.toLowerCase()
          );
        });
      }

      // Apply adviser filter
      if (adviserFilters && adviserFilters.length > 0) {
        groups = groups.filter((group) => {
          const adviser = group.adviser_id
            ? users.find((u) => u._id === group.adviser_id)
            : null;
          
          // Check if "No Adviser" is selected
          const noAdviserSelected = adviserFilters.includes("No Adviser");
          
          // If group has no adviser and "No Adviser" is selected, include it
          if (!adviser && noAdviserSelected) {
            return true;
          }
          
          // If group has no adviser but "No Adviser" is not selected, exclude it
          if (!adviser && !noAdviserSelected) {
            return false;
          }
          
          // If group has an adviser, check if it matches any selected adviser
          if (adviser) {
            const adviserName = `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`;
            return adviserFilters.includes(adviserName);
          }
          
          return false;
        });
      }

      // Grade label to number mapping
      const GRADE_LABEL_TO_NUMBER: { [key: string]: number } = {
        "No Grade": 0,
        Approved: 1,
        "Approved With Revisions": 2,
        Disapproved: 3,
        "Accepted With Revisions": 4,
        "Reoral Defense": 5,
        "Not Accepted": 6,
      };

      // Apply grade filter
      if (gradeFilters && gradeFilters.length > 0) {
        groups = groups.filter((group) => {
          const grade = group.grade;
          
          // Check if any of the selected grade filters match
          return gradeFilters.some((gradeFilter) => {
            if (gradeFilter.toLowerCase() === "no grade") {
              return grade === undefined || grade === null || grade === 0;
            }
            const gradeNumber = GRADE_LABEL_TO_NUMBER[gradeFilter];
            return grade === gradeNumber;
          });
        });
      }

      // Sort the results
      if (sortField && sortDirection) {
        groups.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "name":
              const aManager = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bManager = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
              const aName = aManager ? `${aManager.last_name} et al` : "";
              const bName = bManager ? `${bManager.last_name} et al` : "";
              comparison = aName.localeCompare(bName);
              break;
            case "capstoneTitle":
              comparison = (a.capstone_title || "").localeCompare(
                b.capstone_title || "",
              );
              break;
            case "projectManager":
              const aPM = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bPM = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
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
      const processedGroups = groups.map((group) => {
        const projectManager = group.project_manager_id
          ? users.find((u) => u._id === group.project_manager_id)
          : null;
        return {
          ...group,
          name: projectManager
            ? `${projectManager.last_name} et al`
            : "Unknown Group",
          projectManager,
          adviser: group.adviser_id
            ? users.find((u) => u._id === group.adviser_id)
            : undefined,
          members: group.member_ids
            .map((id) => users.find((u) => u._id === id))
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
        status: "idle",
        hasResults: paginatedResults.length > 0,
      };
    } catch {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: "error",
        hasResults: false,
      };
    }
  },
});

interface DocumentWithStatus {
  _id: Id<"documents">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  chapter: string;
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
      const statusMap = new Map(allStatuses.map((s) => [s.document_part, s]));

      // 3. Get the latest version of each document part
      const latestDocsMap = new Map<string, Doc<"documents">>();
      for (const doc of allDocs) {
        const existing = latestDocsMap.get(doc.chapter);
        if (!existing || doc._creationTime > existing._creationTime) {
          latestDocsMap.set(doc.chapter, doc);
        }
      }

      // 4. Combine documents with their review status
      const documentsWithStatus: DocumentWithStatus[] = Array.from(
        latestDocsMap.values(),
      ).map((doc) => {
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
        if (indexA === -1 && indexB === -1)
          return a.chapter.localeCompare(b.chapter);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });

      return { documents: documentsWithStatus, done: true };
    } catch {
      return {
        documents: [],
        status: "error",
        hasResults: false,
        done: true,
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
          status: "error",
          hasResults: false,
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
        .map((id) => users.find((u) => u._id === id))
        .filter((u): u is NonNullable<typeof u> => u !== undefined)
        .map((user) => ({
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          clerk_id: user.clerk_id,
          isProjectManager: user._id === group.project_manager_id,
        }));

      // Enhance task assignments with user information
      const enhancedTasks = taskAssignments.map((task) => {
        const assignedUsers = task.assigned_student_ids
          .map((id) => users.find((u) => u._id === id))
          .filter((u): u is NonNullable<typeof u> => u !== undefined)
          .map((user) => ({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          }));

        return {
          ...task,
          assignedUsers,
        };
      });

      return {
        tasks: enhancedTasks,
        groupMembers,
        status: "idle",
        hasResults: enhancedTasks.length > 0,
      };
    } catch {
      return {
        tasks: [],
        groupMembers: [],
        status: "error",
        hasResults: false,
      };
    }
  },
});

// =========================================
// Adviser Documents Queries
// =========================================

interface AdviserDocumentWithStatus {
  _id: Id<"documents">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  chapter: string;
  title: string;
  content: string;
  status: number; // This represents review_status from documentStatus table
  last_modified?: number; // This comes from documentStatus.last_modified
}

interface AdviserGroupWithDocuments {
  _id: Id<"groupsTable">;
  capstone_title?: string;
  project_manager_id: Id<"users">;
  member_ids: Id<"users">[];
  adviser_id?: Id<"users">;
  requested_adviser?: Id<"users">;
  grade?: number;
  name?: string;
  projectManager?: {
    _id: Id<"users">;
    first_name: string;
    middle_name?: string;
    last_name: string;
  };
  members?: Array<{
    _id: Id<"users">;
    first_name: string;
    middle_name?: string;
    last_name: string;
  }>;
  adviser?: {
    _id: Id<"users">;
    first_name: string;
    middle_name?: string;
    last_name: string;
  };
  documents: AdviserDocumentWithStatus[];
  documentCount: number;
}

export const getAdviserDocuments = query({
  args: {
    adviserId: v.id("users"),
    searchTerm: v.string(),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      adviserId,
      searchTerm,
      pageSize = 5,
      pageNumber = 1,
      sortField,
      sortDirection,
    } = args;
    const skip = (pageNumber - 1) * pageSize;

    try {
      // Get the adviser's assigned groups
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", adviserId))
        .first();

      if (!adviser?.group_ids || adviser.group_ids.length === 0) {
        return {
          groups: [],
          totalCount: 0,
          totalPages: 0,
          status: "idle",
          hasResults: false,
        };
      }

      // Get all groups assigned to this adviser
      const groups = await ctx.db.query("groupsTable").collect();
      const users = await ctx.db.query("users").collect();

      // Filter groups to only include those assigned to this adviser
      let filteredGroups = groups.filter((group) =>
        adviser.group_ids?.includes(group._id),
      );

      // Apply search if searchTerm is provided
      if (searchTerm.trim()) {
        // Use Convex search functionality for capstone titles
        const capstoneResults = await ctx.db
          .query("groupsTable")
          .withSearchIndex("search_by_capstone_title", (q) =>
            q.search("capstone_title", searchTerm),
          )
          .collect();

        // Filter capstone results to only include groups assigned to this adviser
        const capstoneFiltered = capstoneResults.filter((group) =>
          adviser.group_ids?.includes(group._id),
        );

        // Also search by project manager names
        const allGroups = await ctx.db.query("groupsTable").collect();
        const users = await ctx.db.query("users").collect();

        const managerFiltered = allGroups.filter((group) => {
          if (!adviser.group_ids?.includes(group._id)) return false;

          const projectManager = group.project_manager_id
            ? users.find((u) => u._id === group.project_manager_id)
            : null;
          if (!projectManager) return false;

          const managerName =
            `${projectManager.first_name} ${projectManager.last_name}`.toLowerCase();
          const groupName = `${projectManager.last_name} et al`.toLowerCase();

          return (
            managerName.includes(searchTerm.toLowerCase()) ||
            groupName.includes(searchTerm.toLowerCase())
          );
        });

        // Combine and deduplicate results
        const combinedResults = [...capstoneFiltered, ...managerFiltered];
        filteredGroups = combinedResults.filter(
          (group, index, self) =>
            index === self.findIndex((g) => g._id === group._id),
        );
      }

      // Apply sorting
      if (sortField && sortDirection) {
        filteredGroups.sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "name":
              const aManager = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bManager = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
              const aName = aManager ? `${aManager.last_name} et al` : "";
              const bName = bManager ? `${bManager.last_name} et al` : "";
              comparison = aName.localeCompare(bName);
              break;
            case "capstoneTitle":
              comparison = (a.capstone_title || "").localeCompare(
                b.capstone_title || "",
              );
              break;
            case "projectManager":
              const aPM = a.project_manager_id
                ? users.find((u) => u._id === a.project_manager_id)
                : null;
              const bPM = b.project_manager_id
                ? users.find((u) => u._id === b.project_manager_id)
                : null;
              const aPMName = aPM ? `${aPM.last_name} ${aPM.first_name}` : "";
              const bPMName = bPM ? `${bPM.last_name} ${bPM.first_name}` : "";
              comparison = aPMName.localeCompare(bPMName);
              break;
            case "documentCount":
              // We'll calculate this after processing documents
              comparison = 0;
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Process groups to include documents and user information
      const processedGroups: AdviserGroupWithDocuments[] = [];

      for (const group of filteredGroups) {
        // Get all documents for this group
        const allDocs = await ctx.db
          .query("documents")
          .withIndex("by_group_chapter", (q) => q.eq("group_id", group._id))
          .collect();

        // Get all review statuses for this group
        const allStatuses = await ctx.db
          .query("documentStatus")
          .withIndex("by_group_document", (q) => q.eq("group_id", group._id))
          .collect();

        // Create a map for quick status lookup
        const statusMap = new Map(allStatuses.map((s) => [s.document_part, s]));

        // Get the latest version of each document part
        const latestDocsMap = new Map<string, Doc<"documents">>();
        for (const doc of allDocs) {
          const existing = latestDocsMap.get(doc.chapter);
          if (!existing || doc._creationTime > existing._creationTime) {
            latestDocsMap.set(doc.chapter, doc);
          }
        }

        // Define the order of document chapters (excluding title_page, appendix_a, appendix_d)
        const CHAPTER_ORDER = [
          "acknowledgment",
          "abstract",
          "table_of_contents",
          "chapter_1",
          "chapter_2",
          "chapter_3",
          "chapter_4",
          "chapter_5",
          "references",
          "appendix_b",
          "appendix_c",
          "appendix_e",
          "appendix_f",
          "appendix_g",
          "appendix_h",
          "appendix_i",
        ];

        // Combine documents with their review status
        const documentsWithStatus: AdviserDocumentWithStatus[] = Array.from(
          latestDocsMap.values(),
        )
          .filter(
            (doc) =>
              !["title_page", "appendix_a", "appendix_d"].includes(doc.chapter),
          )
          .map((doc) => {
            const statusInfo = statusMap.get(doc.chapter);
            return {
              ...doc,
              status: statusInfo?.review_status ?? 0, // Default to 0 (Not Submitted)
              last_modified: statusInfo?.last_modified,
            };
          });

        // Sort the documents according to CHAPTER_ORDER
        documentsWithStatus.sort((a, b) => {
          const indexA = CHAPTER_ORDER.indexOf(a.chapter);
          const indexB = CHAPTER_ORDER.indexOf(b.chapter);

          // Handle cases where a chapter might not be in the order array
          if (indexA === -1 && indexB === -1)
            return a.chapter.localeCompare(b.chapter);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;

          return indexA - indexB;
        });

        // Get user information
        const projectManager = group.project_manager_id
          ? users.find((u) => u._id === group.project_manager_id)
          : null;
        const adviser = group.adviser_id
          ? users.find((u) => u._id === group.adviser_id)
          : null;
        const members = group.member_ids
          .map((id) => users.find((u) => u._id === id))
          .filter((u): u is NonNullable<typeof u> => u !== undefined);

        processedGroups.push({
          ...group,
          name: projectManager
            ? `${projectManager.last_name} et al`
            : "Unknown Group",
          projectManager: projectManager
            ? {
                _id: projectManager._id,
                first_name: projectManager.first_name,
                middle_name: projectManager.middle_name,
                last_name: projectManager.last_name,
              }
            : undefined,
          adviser: adviser
            ? {
                _id: adviser._id,
                first_name: adviser.first_name,
                middle_name: adviser.middle_name,
                last_name: adviser.last_name,
              }
            : undefined,
          members: members.map((member) => ({
            _id: member._id,
            first_name: member.first_name,
            middle_name: member.middle_name,
            last_name: member.last_name,
          })),
          documents: documentsWithStatus,
          documentCount: documentsWithStatus.length,
        });
      }

      // Apply document count sorting if needed
      if (sortField === "documentCount" && sortDirection) {
        processedGroups.sort((a, b) => {
          const comparison = a.documentCount - b.documentCount;
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      // Apply pagination
      const totalCount = processedGroups.length;
      const paginatedResults = processedGroups.slice(skip, skip + pageSize);

      return {
        groups: paginatedResults,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        status: "idle",
        hasResults: paginatedResults.length > 0,
      };
    } catch {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: "error",
        hasResults: false,
      };
    }
  },
});

export const getHandledGroupsWithProgress = query({
  args: {
    adviserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get adviser and their group IDs
    const adviser = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();

    if (!adviser) {
      return { groups: [], projectManagers: [] };
    }

    const groupIds = adviser.group_ids || [];
    if (groupIds.length === 0) {
      return { groups: [], projectManagers: [] };
    }

    // Fetch all groups handled by the adviser
    const groups = await Promise.all(groupIds.map((id) => ctx.db.get(id)));

    const validGroups = groups.filter(
      (group): group is NonNullable<typeof group> => group !== null,
    );

    // Fetch all document statuses for these groups
    const allDocumentStatuses = await Promise.all(
      validGroups.map((group) =>
        ctx.db
          .query("documentStatus")
          .withIndex("by_group", (q) => q.eq("group_id", group._id))
          .collect(),
      ),
    );

    // Fetch all project managers for these groups
    const projectManagerIds = validGroups.map((g) => g.project_manager_id);
    const projectManagers = await Promise.all(
      projectManagerIds.map((id) => ctx.db.get(id)),
    );
    const validProjectManagers = projectManagers.filter(
      (pm): pm is NonNullable<typeof pm> => pm !== null,
    );

    const groupsWithProgress = validGroups.map((group, index) => ({
      ...group,
      documentStatuses: allDocumentStatuses[index] || [],
    }));

    return {
      groups: groupsWithProgress,
      projectManagers: validProjectManagers,
    };
  },
});

export const getDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    try {
      const document = await ctx.db.get(args.documentId);
      return document; // Returns null if not found
    } catch {
      return null;
    }
  },
});



export const getUserDocumentAccess = query({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the document
      const document = await ctx.db.get(args.documentId);
      if (!document) {
        return { hasAccess: false, user: null, group: null };
      }

      // Get the user
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { hasAccess: false, user: null, group: null };
      }

      // Get the group to check membership
      const group = await ctx.db.get(document.group_id);
      if (!group) {
        return { hasAccess: false, user, group: null };
      }

      // Check if user has access to this document
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const hasAccess = isProjectManager || isMember;

      return { 
        hasAccess, 
        user: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          subrole: user.subrole,
          email: user.email,
          clerk_id: user.clerk_id,
        }, 
        group: hasAccess ? {
          _id: group._id,
          capstone_title: group.capstone_title,
          project_manager_id: group.project_manager_id,
          member_ids: group.member_ids,
        } : null
      };
    } catch {
      return { hasAccess: false, user: null, group: null };
    }
  },
});

export const getDocuments = query({
  args: {
    groupId: v.id("groupsTable"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // First check if user has access to this group
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        return { documents: [] };
      }

      // Check if user is either project manager or a member
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      
      if (!isProjectManager && !isMember) {
        return { documents: [] }; // User doesn't have access to this group
      }

      // Get all documents for this group using the correct index
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) => q.eq("group_id", args.groupId))
        .collect();
      
      return { documents }; // Returns array of documents for the group
    } catch {
      return { documents: [] };
    }
  },
});

// Get all images (for backup purposes)
export const getAllImages = query({
  handler: async (ctx) => {
    try {
      const images = await ctx.db.query("images").collect();
      return images;
    } catch {
      return [];
    }
  },
});
