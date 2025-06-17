import React from "react";
import { ChevronDown } from "lucide-react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { NotificationBanner } from "./NotificationBanner";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface SecondaryProfileProps {
  userData?: Doc<"studentsTable">;
}

// Type for updateStudentProfile mutation args
type UpdateStudentProfileArgs = {
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
};

export const SecondaryProfile: React.FC<SecondaryProfileProps> = ({ userData }) => {
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
  const [notification, setNotification] = React.useState<{ message: string; type: 'error' | 'success' }>({ message: '', type: 'success' });
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
        gender: userData.gender !== undefined && userData.gender !== null ? String(userData.gender) : "",
        dateOfBirth: userData.dateOfBirth ?? "",
        placeOfBirth: userData.placeOfBirth ?? "",
        nationality: userData.nationality ?? "",
        civilStatus: userData.civilStatus !== undefined && userData.civilStatus !== null ? String(userData.civilStatus) : "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Helper to safely get a field from userData
  function getUserDataField(key: keyof Doc<"studentsTable">): string {
    const value = userData?.[key];
    if (value === undefined || value === null) return "";
    return String(value);
  }

  // Helper to determine if a field has changed, including clearing
  function isFieldChanged(key: keyof Doc<'studentsTable'>, formValue: string): boolean {
    const backendValue = getUserDataField(key);
    // If formValue is "" and backendValue is not "", it's a change (clearing)
    // If formValue !== backendValue, it's a change
    return formValue !== backendValue;
  }

  // Detect unsaved changes for each section
  const hasUnsavedSecondary = [
    'gender', 'dateOfBirth', 'placeOfBirth', 'nationality', 'civilStatus', 'religion', 'homeAddress', 'contact',
  ].some(key => isFieldChanged(key as keyof Doc<'studentsTable'>, form[key]));
  const hasUnsavedEducation = [
    'tertiaryDegree', 'tertiarySchool', 'secondarySchool', 'secondaryAddress', 'primarySchool', 'primaryAddress',
  ].some(key => isFieldChanged(key as keyof Doc<'studentsTable'>, form[key]));

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
  const secondaryFields: (keyof Pick<Doc<"studentsTable">, "gender" | "dateOfBirth" | "placeOfBirth" | "nationality" | "civilStatus" | "religion" | "homeAddress" | "contact">)[] = [
    "gender", "dateOfBirth", "placeOfBirth", "nationality", "civilStatus", "religion", "homeAddress", "contact"
  ];
  const educationFields: (keyof Pick<Doc<"studentsTable">, "tertiaryDegree" | "tertiarySchool" | "secondarySchool" | "secondaryAddress" | "primarySchool" | "primaryAddress">)[] = [
    "tertiaryDegree", "tertiarySchool", "secondarySchool", "secondaryAddress", "primarySchool", "primaryAddress"
  ];

  // Save handlers
  const handleSave = async (section: 'secondary' | 'education') => {
    if ((section === 'secondary' && !hasUnsavedSecondary) || (section === 'education' && !hasUnsavedEducation)) return;
    if (section === 'secondary') setLoadingSecondary(true);
    else setLoadingEducation(true);
    try {
      // Only include changed fields in the payload
      const changedFields: Partial<UpdateStudentProfileArgs> = {};
      if (section === 'secondary') {
        for (const key of secondaryFields) {
          const formValue = form[key] ?? "";
          if (isFieldChanged(key, formValue)) {
            if (key === "gender" || key === "civilStatus") {
              changedFields[key] = formValue === "" ? undefined : Number(formValue);
            } else if (key === "contact") {
              changedFields[key] = formValue;
            } else {
              changedFields[key] = formValue === "" ? "" : sanitizeInput(formValue);
            }
          }
        }
      } else {
        for (const key of educationFields) {
          const formValue = form[key] ?? "";
          if (isFieldChanged(key, formValue)) {
            changedFields[key] = formValue === "" ? "" : sanitizeInput(formValue);
          }
        }
      }
      // Always include userId and section
      const payload: UpdateStudentProfileArgs = {
        userId: userData?.user_id as Id<"users">,
        section,
        ...changedFields
      };
      // If no fields have changed, do not call mutation
      const changedKeys = Object.keys(changedFields);
      if (changedKeys.length === 0) {
        setNotification({ message: 'No changes to save.', type: 'error' });
        setShowNotification(true);
        if (section === 'secondary') setLoadingSecondary(false);
        else setLoadingEducation(false);
        return;
      }
      // Validate only present fields
      if (section === 'secondary' && payload.contact !== undefined) {
        if (typeof payload.contact === 'string' && payload.contact.length !== 11) {
          setNotification({ message: 'Contact number must be 11 digits (Philippines)', type: 'error' });
          setShowNotification(true);
          setLoadingSecondary(false);
          return;
        }
      }
      if (section === 'secondary' && payload.dateOfBirth !== undefined) {
        if (typeof payload.dateOfBirth === 'string') {
          const birthDate = new Date(payload.dateOfBirth);
          if (birthDate > new Date()) {
            setNotification({ message: 'Date of birth cannot be in the future.', type: 'error' });
            setShowNotification(true);
            setLoadingSecondary(false);
            return;
          }
        }
      }
      // Call mutation
      const res = await updateStudentProfile(payload);
      if (res.success) {
        setNotification({ message: 'Profile saved successfully!', type: 'success' });
      } else {
        setNotification({ message: res.message || 'Failed to save profile.', type: 'error' });
      }
      setShowNotification(true);
    } catch {
      setNotification({ message: 'An error occurred while saving.', type: 'error' });
      setShowNotification(true);
    } finally {
      setLoadingSecondary(false);
      setLoadingEducation(false);
    }
  };

  // Helper: Today's date in YYYY-MM-DD format
  const todayStr = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Only allow digits in contact number input
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setForm({ ...form, contact: digits });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8 mt-4 mb-8">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mr-2">Secondary Information</h2>
          {hasUnsavedSecondary && (
            <button
              type="button"
              className="p-1 text-gray-500 hover:text-gray-700 flex items-center"
              aria-label="Save"
              disabled={loadingSecondary}
              onClick={() => handleSave('secondary')}
            >
              {loadingSecondary ? (
                <FaSpinner className="h-5 w-5 animate-spin mr-1" />
              ) : (
                <FaSave className="h-5 w-5" />
              )}
              <span className="ml-2 text-xs text-yellow-600">There are unsaved changes.</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-0">
          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              name="age"
              value={computeAge(form.dateOfBirth || userData?.dateOfBirth)}
              readOnly
              disabled
              placeholder="Auto-calculated from Date of Birth"
              className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm cursor-not-allowed"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm appearance-none pr-10"
            >
              <option value="" disabled hidden>
                {userData?.gender === undefined || userData?.gender === null ? "Select Gender" : ""}
              </option>
              {genderOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              placeholder={userData?.dateOfBirth ? undefined : "YYYY-MM-DD"}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              max={todayStr}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
            <input
              type="text"
              name="placeOfBirth"
              value={form.placeOfBirth}
              onChange={handleChange}
              placeholder="Enter your place of birth"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality</label>
            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
              placeholder="Enter your nationality"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Civil Status</label>
            <select
              name="civilStatus"
              value={form.civilStatus}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm appearance-none pr-10"
            >
              <option value="" disabled hidden>
                {userData?.civilStatus === undefined || userData?.civilStatus === null ? "Select Civil Status" : ""}
              </option>
              {civilStatusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Religion</label>
            <input
              type="text"
              name="religion"
              value={form.religion}
              onChange={handleChange}
              placeholder="Enter your religion"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Home Address</label>
            <input
              type="text"
              name="homeAddress"
              value={form.homeAddress}
              onChange={handleChange}
              placeholder="Enter your home address"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact #</label>
            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleContactChange}
              placeholder="Enter your contact number"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              maxLength={11}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-4">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mr-2">Educational Background</h2>
          {hasUnsavedEducation && (
            <button
              type="button"
              className="p-1 text-gray-500 hover:text-gray-700 flex items-center"
              aria-label="Save"
              disabled={loadingEducation}
              onClick={() => handleSave('education')}
            >
              {loadingEducation ? (
                <FaSpinner className="h-5 w-5 animate-spin mr-1" />
              ) : (
                <FaSave className="h-5 w-5" />
              )}
              <span className="ml-2 text-xs text-yellow-600">There are unsaved changes.</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tertiary School Name</label>
            <input
              type="text"
              name="tertiarySchool"
              value={form.tertiarySchool}
              onChange={handleChange}
              placeholder="Enter your tertiary school name"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bachelor Degree</label>
            <input
              type="text"
              name="tertiaryDegree"
              value={form.tertiaryDegree}
              onChange={handleChange}
              placeholder="Enter your bachelor degree"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary School Name</label>
            <input
              type="text"
              name="secondarySchool"
              value={form.secondarySchool}
              onChange={handleChange}
              placeholder="Enter your secondary school name"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary School Address</label>
            <input
              type="text"
              name="secondaryAddress"
              value={form.secondaryAddress}
              onChange={handleChange}
              placeholder="Enter your secondary school address"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary School Name</label>
            <input
              type="text"
              name="primarySchool"
              value={form.primarySchool}
              onChange={handleChange}
              placeholder="Enter your primary school name"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary School Address</label>
            <input
              type="text"
              name="primaryAddress"
              value={form.primaryAddress}
              onChange={handleChange}
              placeholder="Enter your primary school address"
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
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