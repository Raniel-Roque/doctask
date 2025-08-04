import React from "react";
import { ChevronDown } from "lucide-react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { NotificationBanner } from "../../../components/NotificationBanner";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";

interface UpdateStudentProfileArgs {
  userId: Id<"users">;
  section: "secondary" | "education";
  gender?: number;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  civilStatus?: number;
  religion?: string;
  homeAddress?: string;
  contact?: string;
  tertiaryDegree?: string;
  tertiarySchool?: string;
  secondarySchool?: string;
  secondaryAddress?: string;
  primarySchool?: string;
  primaryAddress?: string;
}

interface SecondaryProfileProps {
  userData?: Doc<"studentsTable">;
}

export const SecondaryProfile: React.FC<SecondaryProfileProps> = ({
  userData,
}) => {
  // Helper: Enum mappings
  const genderOptions = [
    { value: 0, label: "Male" },
    { value: 1, label: "Female" },
    { value: 2, label: "Other" },
  ];
  const civilStatusOptions = [
    { value: 0, label: "Single" },
    { value: 1, label: "Married" },
    { value: 2, label: "Divorced" },
    { value: 3, label: "Widowed" },
  ];

  // Notification state
  const [notification, setNotification] = React.useState<{
    message: string;
    type: "error" | "success";
  }>({ message: "", type: "success" });
  const [showNotification, setShowNotification] = React.useState(false);

  // Loading state for each section
  const [loadingSecondary, setLoadingSecondary] = React.useState(false);
  const [loadingEducation, setLoadingEducation] = React.useState(false);

  // Mutation
  const updateStudentProfile = useMutation(api.mutations.updateStudentProfile);

  // Form state for editable fields only
  const [form, setForm] = React.useState<Record<string, string>>({
    gender: userData?.gender?.toString() ?? "",
    dateOfBirth: userData?.dateOfBirth ?? "",
    placeOfBirth: userData?.placeOfBirth ?? "",
    nationality: userData?.nationality ?? "",
    civilStatus: userData?.civilStatus?.toString() ?? "",
    religion: userData?.religion ?? "",
    homeAddress: userData?.homeAddress ?? "",
    contact: userData?.contact ?? "",
    tertiaryDegree: userData?.tertiaryDegree ?? "",
    tertiarySchool: userData?.tertiarySchool ?? "",
    secondarySchool: userData?.secondarySchool ?? "",
    secondaryAddress: userData?.secondaryAddress ?? "",
    primarySchool: userData?.primarySchool ?? "",
    primaryAddress: userData?.primaryAddress ?? "",
  });

  // Sync form state with userData when it changes
  React.useEffect(() => {
    if (userData) {
      setForm({
        gender:
          userData.gender !== undefined && userData.gender !== null
            ? String(userData.gender)
            : "",
        dateOfBirth: userData.dateOfBirth ?? "",
        placeOfBirth: userData.placeOfBirth ?? "",
        nationality: userData.nationality ?? "",
        civilStatus:
          userData.civilStatus !== undefined && userData.civilStatus !== null
            ? String(userData.civilStatus)
            : "",
        religion: userData.religion ?? "",
        homeAddress: userData.homeAddress ?? "",
        contact: userData.contact ?? "",
        tertiaryDegree: userData.tertiaryDegree ?? "",
        tertiarySchool: userData.tertiarySchool ?? "",
        secondarySchool: userData.secondarySchool ?? "",
        secondaryAddress: userData.secondaryAddress ?? "",
        primarySchool: userData.primarySchool ?? "",
        primaryAddress: userData.primaryAddress ?? "",
      });
    }
  }, [userData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Helper to safely get a field from userData
  function getUserDataField(key: keyof Doc<"studentsTable">): string {
    const value = userData?.[key];
    if (value === undefined || value === null) return "";
    return String(value);
  }

  // Helper to determine if a field has changed, including clearing
  function isFieldChanged(
    key: keyof Doc<"studentsTable">,
    formValue: string,
  ): boolean {
    const backendValue = getUserDataField(key);

    // Normalize values for comparison
    const normalizedFormValue = formValue.trim();
    const normalizedBackendValue = backendValue.trim();

    // If both are empty, no change
    if (normalizedFormValue === "" && normalizedBackendValue === "") {
      return false;
    }

    // If form is empty but backend has data, it's a change (clearing)
    if (normalizedFormValue === "" && normalizedBackendValue !== "") {
      return true;
    }

    // If form has data but backend is empty, it's a change (adding)
    if (normalizedFormValue !== "" && normalizedBackendValue === "") {
      return true;
    }

    // Otherwise, compare the values
    return normalizedFormValue !== normalizedBackendValue;
  }

  // Detect unsaved changes for each section
  const hasUnsavedSecondary = [
    "gender",
    "dateOfBirth",
    "placeOfBirth",
    "nationality",
    "civilStatus",
    "religion",
    "homeAddress",
    "contact",
  ].some((key) => isFieldChanged(key as keyof Doc<"studentsTable">, form[key]));
  const hasUnsavedEducation = [
    "tertiaryDegree",
    "tertiarySchool",
    "secondarySchool",
    "secondaryAddress",
    "primarySchool",
    "primaryAddress",
  ].some((key) => isFieldChanged(key as keyof Doc<"studentsTable">, form[key]));

  // Age calculation (only if valid and not in the future)
  const computeAge = (dob?: string) => {
    if (!dob || typeof dob !== "string") return "";
    const birthDate = new Date(dob);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate > today) return "";
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper: List of all secondary and education fields with their types
  const secondaryFields: (keyof Pick<
    Doc<"studentsTable">,
    | "gender"
    | "dateOfBirth"
    | "placeOfBirth"
    | "nationality"
    | "civilStatus"
    | "religion"
    | "homeAddress"
    | "contact"
  >)[] = [
    "gender",
    "dateOfBirth",
    "placeOfBirth",
    "nationality",
    "civilStatus",
    "religion",
    "homeAddress",
    "contact",
  ];
  const educationFields: (keyof Pick<
    Doc<"studentsTable">,
    | "tertiaryDegree"
    | "tertiarySchool"
    | "secondarySchool"
    | "secondaryAddress"
    | "primarySchool"
    | "primaryAddress"
  >)[] = [
    "tertiaryDegree",
    "tertiarySchool",
    "secondarySchool",
    "secondaryAddress",
    "primarySchool",
    "primaryAddress",
  ];

  // Save handlers
  const handleSave = async (section: "secondary" | "education") => {
    if (
      (section === "secondary" && !hasUnsavedSecondary) ||
      (section === "education" && !hasUnsavedEducation)
    )
      return;
    if (section === "secondary") setLoadingSecondary(true);
    else setLoadingEducation(true);
    try {
      // Only include changed fields in the payload
      const changedFields: Partial<UpdateStudentProfileArgs> = {};
      if (section === "secondary") {
        for (const key of secondaryFields) {
          const formValue = form[key] ?? "";
          if (isFieldChanged(key, formValue)) {
            if (key === "gender" || key === "civilStatus") {
              changedFields[key] =
                formValue === "" ? undefined : Number(formValue);
            } else if (key === "contact") {
              changedFields[key] = formValue === "" ? "" : formValue;
            } else {
              changedFields[key] = formValue === "" ? "" : formValue;
            }
          }
        }
      } else {
        for (const key of educationFields) {
          const formValue = form[key] ?? "";
          if (isFieldChanged(key, formValue)) {
            changedFields[key] = formValue === "" ? undefined : formValue;
          }
        }
      }
      // Always include userId and section
      const payload: UpdateStudentProfileArgs = {
        userId: userData?.user_id as Id<"users">,
        section,
        ...changedFields,
      };
      // If no fields have changed, do not call mutation
      const changedKeys = Object.keys(changedFields);
      if (changedKeys.length === 0) {
        setNotification({ message: "No changes to save.", type: "error" });
        setShowNotification(true);
        if (section === "secondary") setLoadingSecondary(false);
        else setLoadingEducation(false);
        return;
      }
      // Validate only present fields
      if (section === "secondary" && payload.contact !== undefined) {
        if (
          typeof payload.contact === "string" &&
          payload.contact.length > 0 &&
          payload.contact.length !== 11 // 11 digits (09XXXXXXXXX)
        ) {
          setNotification({
            message: "Contact number must be 11 digits (09XXXXXXXXX)",
            type: "error",
          });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
      }

      // Validate field length limits for secondary section
      if (section === "secondary") {
        if (
          payload.placeOfBirth !== undefined &&
          payload.placeOfBirth.length > 255
        ) {
          setNotification({
            message: "Place of birth must be 255 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
        if (
          payload.nationality !== undefined &&
          payload.nationality.length > 50
        ) {
          setNotification({
            message: "Nationality must be 50 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
        if (payload.religion !== undefined && payload.religion.length > 20) {
          setNotification({
            message: "Religion must be 20 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
        if (
          payload.homeAddress !== undefined &&
          payload.homeAddress.length > 255
        ) {
          setNotification({
            message: "Home address must be 255 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
      }

      // Validate field length limits for education section
      if (section === "education") {
        if (
          payload.tertiarySchool !== undefined &&
          payload.tertiarySchool.length > 50
        ) {
          setNotification({
            message: "Tertiary school name must be 50 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
        if (
          payload.tertiaryDegree !== undefined &&
          payload.tertiaryDegree.length > 50
        ) {
          setNotification({
            message: "Bachelor degree must be 50 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
        if (
          payload.secondarySchool !== undefined &&
          payload.secondarySchool.length > 50
        ) {
          setNotification({
            message: "Secondary school name must be 50 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
        if (
          payload.secondaryAddress !== undefined &&
          payload.secondaryAddress.length > 255
        ) {
          setNotification({
            message: "Secondary school address must be 255 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
        if (
          payload.primarySchool !== undefined &&
          payload.primarySchool.length > 50
        ) {
          setNotification({
            message: "Primary school name must be 50 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
        if (
          payload.primaryAddress !== undefined &&
          payload.primaryAddress.length > 255
        ) {
          setNotification({
            message: "Primary school address must be 255 characters or less.",
            type: "error",
          });
          setShowNotification(true);
          setLoadingEducation(false);
          return;
        }
      }
      if (section === "secondary" && payload.dateOfBirth !== undefined) {
        if (typeof payload.dateOfBirth === "string") {
          const birthDate = new Date(payload.dateOfBirth);
          const today = new Date();

          if (birthDate > today) {
            setNotification({
              message: "Date of birth cannot be in the future.",
              type: "error",
            });
            setShowNotification(true);
            setLoadingSecondary(false);
            return;
          }

          // Check minimum age of 16
          const minAgeDate = new Date(
            today.getFullYear() - 16,
            today.getMonth(),
            today.getDate(),
          );
          if (birthDate > minAgeDate) {
            setNotification({
              message: "You must be at least 16 years old.",
              type: "error",
            });
            setShowNotification(true);
            setLoadingSecondary(false);
            return;
          }
        }
      }
      // Call mutation
      const res = await updateStudentProfile(payload);
      if (res.success) {
        setNotification({
          message: "Profile saved successfully!",
          type: "success",
        });
      } else {
        setNotification({
          message: res.message || "Failed to save profile.",
          type: "error",
        });
      }
      setShowNotification(true);
    } catch {
      setNotification({
        message: "An error occurred while saving.",
        type: "error",
      });
      setShowNotification(true);
    } finally {
      setLoadingSecondary(false);
      setLoadingEducation(false);
    }
  };

  // Helper: Today's date in YYYY-MM-DD format (maximum selectable date)
  const todayStr = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Only allow digits in contact number input
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/[^0-9]/g, "");

    // Allow up to 11 digits
    const maxDigits = digits.slice(0, 11);

    setForm({ ...form, contact: maxDigits });
  };

  // Only allow letters, spaces, and common punctuation for text fields
  const handleTextOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow letters, spaces, hyphens, apostrophes, and periods
    const filteredValue = value.replace(/[^a-zA-Z\s\-'\.]/g, "");
    setForm({ ...form, [e.target.name]: filteredValue });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8 mt-4 mb-8">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mr-2">
            Secondary Information
          </h2>
          {hasUnsavedSecondary && (
            <button
              type="button"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors"
              aria-label="Save"
              disabled={loadingSecondary}
              onClick={() => handleSave("secondary")}
            >
              {loadingSecondary ? (
                <FaSpinner className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FaSave className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">
                {loadingSecondary ? "Saving..." : "Save Changes"}
              </span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-0">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={computeAge(form.dateOfBirth || userData?.dateOfBirth)}
              readOnly
              disabled
              placeholder="Auto-calculated from Date of Birth"
              className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm cursor-not-allowed"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm appearance-none pr-10"
            >
              <option value="" disabled hidden>
                {userData?.gender === undefined || userData?.gender === null
                  ? "Select Gender"
                  : ""}
              </option>
              {genderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              placeholder={userData?.dateOfBirth ? undefined : "YYYY-MM-DD"}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              max={todayStr}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Place of Birth
            </label>
            <input
              type="text"
              name="placeOfBirth"
              value={form.placeOfBirth}
              onChange={handleTextOnlyChange}
              placeholder="Enter your place of birth"
              maxLength={255}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={handleTextOnlyChange}
              placeholder="Enter your nationality"
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              Civil Status
            </label>
            <select
              name="civilStatus"
              value={form.civilStatus}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm appearance-none pr-10"
            >
              <option value="" disabled hidden>
                {userData?.civilStatus === undefined ||
                userData?.civilStatus === null
                  ? "Select Civil Status"
                  : ""}
              </option>
              {civilStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Religion
            </label>
            <input
              type="text"
              name="religion"
              value={form.religion}
              onChange={handleTextOnlyChange}
              placeholder="Enter your religion"
              maxLength={20}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Home Address
            </label>
            <input
              type="text"
              name="homeAddress"
              value={form.homeAddress}
              onChange={handleChange}
              placeholder="Enter your home address"
              maxLength={255}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact #
            </label>
            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleContactChange}
              placeholder="Enter your contact number"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-4">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mr-2">
            Educational Background
          </h2>
          {hasUnsavedEducation && (
            <button
              type="button"
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center transition-colors"
              aria-label="Save"
              disabled={loadingEducation}
              onClick={() => handleSave("education")}
            >
              {loadingEducation ? (
                <FaSpinner className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FaSave className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">
                {loadingEducation ? "Saving..." : "Save Changes"}
              </span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tertiary School Name
            </label>
            <input
              type="text"
              name="tertiarySchool"
              value={form.tertiarySchool}
              onChange={handleChange}
              placeholder="Enter your tertiary school name"
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bachelor Degree
            </label>
            <input
              type="text"
              name="tertiaryDegree"
              value={form.tertiaryDegree}
              onChange={handleChange}
              placeholder="Enter your bachelor degree"
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Secondary School Name
            </label>
            <input
              type="text"
              name="secondarySchool"
              value={form.secondarySchool}
              onChange={handleChange}
              placeholder="Enter your secondary school name"
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Secondary School Address
            </label>
            <input
              type="text"
              name="secondaryAddress"
              value={form.secondaryAddress}
              onChange={handleChange}
              placeholder="Enter your secondary school address"
              maxLength={255}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primary School Name
            </label>
            <input
              type="text"
              name="primarySchool"
              value={form.primarySchool}
              onChange={handleChange}
              placeholder="Enter your primary school name"
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primary School Address
            </label>
            <input
              type="text"
              name="primaryAddress"
              value={form.primaryAddress}
              onChange={handleChange}
              placeholder="Enter your primary school address"
              maxLength={255}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      <NotificationBanner
        message={showNotification ? notification.message : null}
        type={notification.type}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};
