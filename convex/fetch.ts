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
    const user = await ctx.db.get(args.id);
    return user && !user.isDeleted ? user : null; // returns null if not found or deleted
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerkId))
      .first();
    return user && !user.isDeleted ? user : null; // will return null if not found or deleted
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
      .collect()
      .then((results) =>
        results.filter((u) => !u.isDeleted).slice(skip, skip + pageSize),
      );

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 1))
      .collect()
      .then((results) => results.filter((u) => !u.isDeleted).length);

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
      .collect()
      .then((results) =>
        results.filter((u) => !u.isDeleted).slice(skip, skip + pageSize),
      );

    const totalCount = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 0))
      .collect()
      .then((results) => results.filter((u) => !u.isDeleted).length);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },
});

export const getInstructors = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 2))
      .collect()
      .then((results) => results.filter((u) => !u.isDeleted));

    return users;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Get all users with this email (non-deleted) and sort by creation time
    // to ensure we get the most recent one
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email.toLowerCase()),
          q.neq(q.field("isDeleted"), true),
        ),
      )
      .collect();

    // Sort by creation time (newest first) and return the most recent
    if (users.length > 0) {
      return users.sort((a, b) => b._creationTime - a._creationTime)[0];
    }

    return null;
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
      .then((results) =>
        results.filter((g) => !g.isDeleted).slice(skip, skip + pageSize),
      );

    const totalCount = await ctx.db
      .query("groupsTable")
      .collect()
      .then((results) => results.filter((g) => !g.isDeleted).length);

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
    return users.filter((u) => !u.isDeleted);
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
      const groups = await ctx.db
        .query("groupsTable")
        .collect()
        .then((results) => results.filter((g) => !g.isDeleted));
      const users = await ctx.db
        .query("users")
        .collect()
        .then((results) => results.filter((u) => !u.isDeleted));

      // Filter groups to only include pending ones AND not deleted
      let filteredGroups = groups.filter(
        (group) =>
          adviser.requests_group_ids?.includes(group._id) && !group.isDeleted,
      );

      // Apply search if searchTerm is provided
      if (searchTerm.trim()) {
        // Use Convex search functionality for capstone titles
        const capstoneResults = await ctx.db
          .query("groupsTable")
          .withSearchIndex("search_by_capstone_title", (q) =>
            q.search("capstone_title", searchTerm),
          )
          .collect()
          .then((results) => results.filter((g) => !g.isDeleted));

        // Filter capstone results to only include groups assigned to this adviser AND not deleted
        const capstoneFiltered = capstoneResults.filter(
          (group) => adviser.group_ids?.includes(group._id) && !group.isDeleted,
        );

        // Also search by project manager names
        const allGroups = await ctx.db
          .query("groupsTable")
          .collect()
          .then((results) => results.filter((g) => !g.isDeleted));
        const users = await ctx.db
          .query("users")
          .collect()
          .then((results) => results.filter((u) => !u.isDeleted));

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
          .collect()
          .then((results) => results.filter((u) => !u.isDeleted));
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
          .collect()
          .then((results) => results.filter((u) => !u.isDeleted));

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
          .collect()
          .then((results) => results.filter((u) => !u.isDeleted));

        // Combine and deduplicate results
        results = [...firstNameResults, ...lastNameResults].filter(
          (user, index, self) =>
            index === self.findIndex((u) => u._id === user._id),
        );
      }

      // Filter out deleted users
      results = results.filter((u) => !u.isDeleted);

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
      let groups = await ctx.db
        .query("groupsTable")
        .collect()
        .then((results) => results.filter((g) => !g.isDeleted));

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
  note_count: number; // Number of notes for this document
}

export const getDocumentsWithStatus = query({
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
        .collect()
        .then((results) => results.filter((d) => !d.isDeleted));

      // 2. Fetch all review statuses for the group
      const allStatuses = await ctx.db
        .query("documentStatus")
        .withIndex("by_group_document", (q) => q.eq("group_id", groupId))
        .collect()
        .then((results) => results.filter((s) => !s.isDeleted));

      // Create a map for quick status lookup
      const statusMap = new Map(allStatuses.map((s) => [s.document_part, s]));

      // 3. Get the oldest version of each document part (this is the live document with room ID)
      const oldestDocsMap = new Map<string, Doc<"documents">>();
      for (const doc of allDocs) {
        const existing = oldestDocsMap.get(doc.chapter);
        if (!existing || doc._creationTime < existing._creationTime) {
          oldestDocsMap.set(doc.chapter, doc);
        }
      }

      // 4. Combine documents with their review status
      const documentsWithStatus: DocumentWithStatus[] = Array.from(
        oldestDocsMap.values(),
      ).map((doc) => {
        const statusInfo = statusMap.get(doc.chapter);
        return {
          ...doc,
          student_ids: allStudentIds, // Attach the student IDs
          status: statusInfo?.review_status ?? 0, // Default to 0 (Not Submitted)
          last_modified: statusInfo?.last_modified,
          note_count: statusInfo?.note_ids?.length ?? 0, // Number of notes for this document
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
        .collect()
        .then((results) => results.filter((t) => !t.isDeleted));

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
  note_count: number; // Number of notes for this document
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

      // Filter groups to only include those assigned to this adviser AND not deleted
      let filteredGroups = groups.filter(
        (group) => adviser.group_ids?.includes(group._id) && !group.isDeleted,
      );

      // Apply search if searchTerm is provided
      if (searchTerm.trim()) {
        // Use Convex search functionality for capstone titles
        const capstoneResults = await ctx.db
          .query("groupsTable")
          .withSearchIndex("search_by_capstone_title", (q) =>
            q.search("capstone_title", searchTerm),
          )
          .collect()
          .then((results) => results.filter((g) => !g.isDeleted));

        // Filter capstone results to only include groups assigned to this adviser
        const capstoneFiltered = capstoneResults.filter((group) =>
          adviser.group_ids?.includes(group._id),
        );

        // Also search by project manager names
        const allGroups = await ctx.db
          .query("groupsTable")
          .collect()
          .then((results) => results.filter((g) => !g.isDeleted));
        const users = await ctx.db
          .query("users")
          .collect()
          .then((results) => results.filter((u) => !u.isDeleted));

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
          .collect()
          .then((results) => results.filter((d) => !d.isDeleted));

        // Get all review statuses for this group
        const allStatuses = await ctx.db
          .query("documentStatus")
          .withIndex("by_group_document", (q) => q.eq("group_id", group._id))
          .collect()
          .then((results) => results.filter((s) => !s.isDeleted));

        // Create a map for quick status lookup
        const statusMap = new Map(allStatuses.map((s) => [s.document_part, s]));

        // Get the oldest version of each document part
        const oldestDocsMap = new Map<string, Doc<"documents">>();
        for (const doc of allDocs) {
          const existing = oldestDocsMap.get(doc.chapter);
          if (!existing || doc._creationTime < existing._creationTime) {
            oldestDocsMap.set(doc.chapter, doc);
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
          oldestDocsMap.values(),
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
              note_count: statusInfo?.note_ids?.length ?? 0, // Number of notes for this document
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

      // Check if user is an adviser assigned to this group
      const isAdviser = group.adviser_id === args.userId;

      const hasAccess = isProjectManager || isMember || isAdviser;

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
        group: hasAccess
          ? {
              _id: group._id,
              capstone_title: group.capstone_title,
              project_manager_id: group.project_manager_id,
              member_ids: group.member_ids,
              adviser_id: group.adviser_id,
            }
          : null,
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

      // Check if user is either project manager, member, or adviser
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const isAdviser = group.adviser_id === args.userId;

      if (!isProjectManager && !isMember && !isAdviser) {
        return { documents: [] }; // User doesn't have access to this group
      }

      // Get all documents for this group using the correct index
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) => q.eq("group_id", args.groupId))
        .collect()
        .then((results) => results.filter((d) => !d.isDeleted));

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
      return images.filter((image) => !image.isDeleted);
    } catch {
      return [];
    }
  },
});

export const getDocumentVersions = query({
  args: {
    groupId: v.id("groupsTable"),
    chapter: v.string(),
    userId: v.id("users"), // For permission checking
  },
  handler: async (ctx, args) => {
    try {
      // Check if user has permission (must be project manager)
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        return {
          versions: [],
          success: false,
          error: "Group not found",
        };
      }

      // Only project manager can view version history
      if (group.project_manager_id !== args.userId) {
        return {
          versions: [],
          success: false,
          error: "Only the project manager can view version history",
        };
      }

      // Get all versions of this document, ordered by creation time DESC (newest first)
      const versions = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) =>
          q.eq("group_id", args.groupId).eq("chapter", args.chapter),
        )
        .order("desc") // Most recent first (LIFO stack)
        .collect()
        .then((results) => results.filter((d) => !d.isDeleted));

      // The first document (oldest) is the live template with room ID
      // The rest are version snapshots
      const liveDocument = versions[versions.length - 1]; // Last in DESC order = oldest
      const versionSnapshots = versions.slice(0, -1); // All except the oldest

      return {
        versions: versionSnapshots,
        liveDocument,
        success: true,
      };
    } catch (error) {
      return {
        versions: [],
        liveDocument: null,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch versions",
      };
    }
  },
});

export const getDocumentVersion = query({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"), // For permission checking
  },
  handler: async (ctx, args) => {
    try {
      // Get the document version
      const document = await ctx.db.get(args.documentId);
      if (!document) {
        return {
          document: null,
          success: false,
          error: "Document version not found",
        };
      }

      // Check if user has permission (must be project manager)
      const group = await ctx.db.get(document.group_id);
      if (!group) {
        return {
          document: null,
          success: false,
          error: "Group not found",
        };
      }

      // Only project manager can view version details
      if (group.project_manager_id !== args.userId) {
        return {
          document: null,
          success: false,
          error: "Only the project manager can view version details",
        };
      }

      return {
        document,
        success: true,
      };
    } catch (error) {
      return {
        document: null,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch document version",
      };
    }
  },
});

export const getCurrentDocumentVersion = query({
  args: {
    groupId: v.id("groupsTable"),
    chapter: v.string(),
    userId: v.id("users"), // For permission checking
  },
  handler: async (ctx, args) => {
    try {
      // Check if user has access to this group
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        return {
          document: null,
          success: false,
          error: "Group not found",
        };
      }

      // Check if user is part of this group (project manager, member, or adviser)
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const isAdviser = group.adviser_id === args.userId;

      if (!isProjectManager && !isMember && !isAdviser) {
        return {
          document: null,
          success: false,
          error: "You don't have permission to access this document",
        };
      }

      // Get the live document (oldest by creation time - the one with room ID)
      const liveDocument = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) =>
          q.eq("group_id", args.groupId).eq("chapter", args.chapter),
        )
        .order("asc") // Oldest first (live document with room ID)
        .first();

      return {
        document: liveDocument,
        success: true,
      };
    } catch (error) {
      return {
        document: null,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch live document",
      };
    }
  },
});

export const getLiveDocumentId = query({
  args: {
    groupId: v.id("groupsTable"),
    chapter: v.string(),
    userId: v.id("users"), // For permission checking
  },
  handler: async (ctx, args) => {
    try {
      // Check if user has access to this group
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        return {
          documentId: null,
          success: false,
          error: "Group not found",
        };
      }

      // Check if user is part of this group (project manager, member, or adviser)
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const isAdviser = group.adviser_id === args.userId;

      if (!isProjectManager && !isMember && !isAdviser) {
        return {
          documentId: null,
          success: false,
          error: "You don't have permission to access this document",
        };
      }

      // Get the live document ID (original/first document with room ID)
      const liveDocument = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) =>
          q.eq("group_id", args.groupId).eq("chapter", args.chapter),
        )
        .order("asc") // Oldest first (original document with room ID)
        .first()
        .then((d) => (d && !d.isDeleted ? d._id : null));

      return {
        documentId: liveDocument,
        success: true,
      };
    } catch (error) {
      return {
        documentId: null,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch live document ID",
      };
    }
  },
});

export const getAdviserGroups = query({
  args: {
    adviserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the adviser's assigned groups from advisersTable
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
        .first();

      if (!adviser?.group_ids || adviser.group_ids.length === 0) {
        return [];
      }

      // Get all groups and filter to only those assigned to this adviser
      const groups = await ctx.db.query("groupsTable").collect();
      const assignedGroups = groups.filter(
        (group) => adviser.group_ids?.includes(group._id) && !group.isDeleted,
      );

      return assignedGroups;
    } catch {
      return [];
    }
  },
});

// =========================================
// NOTES QUERIES
// =========================================

export const getDocumentNotes = query({
  args: {
    groupId: v.id("groupsTable"),
    documentPart: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get all notes for this document, ordered by creation time (oldest first)
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_group_document", (q) =>
          q.eq("group_id", args.groupId).eq("document_part", args.documentPart),
        )
        .order("asc") // Oldest first
        .collect()
        .then((results) => results.filter((n) => !n.isDeleted));

      return {
        notes,
        success: true,
      };
    } catch (error) {
      return {
        notes: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch notes",
      };
    }
  },
});

// =========================================
// LOGS QUERIES
// =========================================

export const getLogsWithDetails = query({
  args: {
    userRole: v.optional(v.number()), // 0 = instructor, 1 = adviser
    userId: v.optional(v.id("users")),
    pageSize: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
    action: v.optional(v.union(v.string(), v.array(v.string()))), // allow string or array
    entityType: v.optional(v.union(v.string(), v.array(v.string()))), // allow string or array
    instructorIds: v.optional(v.array(v.id("users"))), // Array of instructor IDs to filter by
    adviserIds: v.optional(v.array(v.id("users"))), // Array of adviser IDs to filter by
  },
  handler: async (ctx, args) => {
    let logs: Array<{
      _id: Id<"LogsTable">;
      _creationTime: number;
      user_id: Id<"users">;
      user_role: number;
      action: string;
      details: string;
      affected_entity_type: string;
      affected_entity_id: Id<"users"> | Id<"groupsTable">;
    }> = [];

    // Apply filters if provided
    if (args.userRole !== undefined && args.userId) {
      // Both filters - we need to collect and filter manually since we can't chain indexes
      const logsByRole = await ctx.db
        .query("LogsTable")
        .withIndex("by_user_role", (q) => q.eq("user_role", args.userRole!))
        .collect();
      logs = logsByRole.filter((log) => log.user_id === args.userId);
    } else if (args.userRole !== undefined) {
      logs = await ctx.db
        .query("LogsTable")
        .withIndex("by_user_role", (q) => q.eq("user_role", args.userRole!))
        .collect();
    } else if (args.userId) {
      logs = await ctx.db
        .query("LogsTable")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId!))
        .collect();
    } else {
      logs = await ctx.db.query("LogsTable").collect();
    }

    // Multi-select filter by instructor IDs if provided (before pagination)
    if (args.instructorIds && args.instructorIds.length > 0) {
      logs = logs.filter((log) => args.instructorIds!.includes(log.user_id));
    }

    // Multi-select filter by adviser IDs if provided (before pagination)
    if (args.adviserIds && args.adviserIds.length > 0) {
      logs = logs.filter((log) => args.adviserIds!.includes(log.user_id));
    }

    // Multi-select filter by action if provided (before pagination)
    if (
      args.action != null &&
      Array.isArray(args.action) &&
      args.action.length > 0
    ) {
      logs = logs.filter((log) => args.action!.includes(log.action));
    } else if (typeof args.action === "string") {
      logs = logs.filter((log) => log.action === args.action);
    }
    // Multi-select filter by entityType if provided (before pagination)
    if (
      args.entityType != null &&
      Array.isArray(args.entityType) &&
      args.entityType.length > 0
    ) {
      logs = logs.filter((log) =>
        args.entityType!.includes(log.affected_entity_type),
      );
    } else if (typeof args.entityType === "string") {
      logs = logs.filter((log) => log.affected_entity_type === args.entityType);
    }

    // Sort logs by creation time descending (most recent first)
    logs.sort((a, b) => b._creationTime - a._creationTime);

    // Pagination
    const pageSize = args.pageSize ?? 5;
    const pageNumber = args.pageNumber ?? 1;
    const skip = (pageNumber - 1) * pageSize;
    const totalCount = logs.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedLogs = logs.slice(skip, skip + pageSize);

    // Fetch details for each log entry
    const logsWithDetails = await Promise.all(
      paginatedLogs.map(async (log) => {
        // Fetch the user who performed the action
        const user = await ctx.db.get(log.user_id);

        // Fetch the affected entity
        let affectedEntity = null;
        if (log.affected_entity_type === "user") {
          affectedEntity = await ctx.db.get(
            log.affected_entity_id as Id<"users">,
          );
        } else if (log.affected_entity_type === "group") {
          const group = await ctx.db.get(
            log.affected_entity_id as Id<"groupsTable">,
          );
          if (group) {
            // Fetch the project manager to construct the group name
            const projectManager = await ctx.db.get(group.project_manager_id);
            affectedEntity = {
              projectManager: projectManager
                ? {
                    last_name: projectManager.last_name,
                  }
                : undefined,
            };
          }
        }

        return {
          ...log,
          user:
            user && "first_name" in user
              ? {
                  first_name: user.first_name,
                  middle_name: user.middle_name,
                  last_name: user.last_name,
                  email: user.email,
                }
              : null,
          affectedEntity: affectedEntity
            ? "role" in affectedEntity && "first_name" in affectedEntity
              ? {
                  first_name: affectedEntity.first_name,
                  middle_name: affectedEntity.middle_name,
                  last_name: affectedEntity.last_name,
                  email: affectedEntity.email,
                }
              : "projectManager" in affectedEntity
                ? {
                    projectManager: affectedEntity.projectManager,
                  }
                : null
            : null,
        };
      }),
    );

    return {
      logs: logsWithDetails,
      totalCount,
      totalPages,
      pageSize,
      pageNumber,
    };
  },
});

// =========================================
// TERMS AGREEMENT QUERIES
// =========================================

export const getUserTermsAgreement = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return {
          hasAgreed: false,
          termsAgreed: false,
          privacyAgreed: false,
          user: null,
        };
      }

      const hasAgreed =
        user.terms_agreed === true && user.privacy_agreed === true;

      return {
        hasAgreed,
        termsAgreed: user.terms_agreed === true,
        privacyAgreed: user.privacy_agreed === true,
        user: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          subrole: user.subrole,
        },
      };
    } catch {
      return {
        hasAgreed: false,
        termsAgreed: false,
        privacyAgreed: false,
        user: null,
      };
    }
  },
});

export const getDocumentVersionsWithContributors = query({
  args: {
    groupId: v.id("groupsTable"),
    chapter: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get all documents for this group and chapter (excluding deleted ones)
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) =>
          q.eq("group_id", args.groupId).eq("chapter", args.chapter),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false)) // Only get non-deleted documents
        .order("desc") // Newest first
        .collect();

      // Get all unique contributor user IDs
      const allContributorIds = documents
        .flatMap(doc => doc.contributors || [])
        .filter((id, index, array) => array.indexOf(id) === index); // Remove duplicates

      // Fetch all contributor users (excluding deleted users)
      const contributors = await Promise.all(
        allContributorIds.map(async (userId) => {
          const user = await ctx.db.get(userId);
          return user && !user.isDeleted ? {
            id: userId,
            name: `${user.first_name} ${user.last_name}`.trim(),
          } : null;
        })
      );

      const validContributors = contributors.filter(c => c !== null);

      // Map documents with contributor names
      const documentsWithContributors = documents.map(doc => ({
        ...doc,
        contributorNames: (doc.contributors || [])
          .map(userId => {
            const contributor = validContributors.find(c => c?.id === userId);
            return contributor?.name || 'Unknown User';
          })
          .filter(name => name !== 'Unknown User')
      }));

      return {
        success: true,
        versions: documentsWithContributors,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch versions",
        versions: []
      };
    }
  },
});
