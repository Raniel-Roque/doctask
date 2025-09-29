import { FaFileExcel, FaTimes, FaSpinner } from "react-icons/fa";

interface ExcelUploadConfirmationProps {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export const ExcelUploadConfirmation = ({
  fileName,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: ExcelUploadConfirmationProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <FaFileExcel size={24} color="#1D6F42" />
          <h2 className="text-xl font-semibold text-gray-900">
            Confirm Excel Upload
          </h2>
        </div>

        <p className="text-gray-600 mb-6">
          Are you sure you want to upload <strong>{fileName}</strong>? This will
          create new accounts based on the data in the file.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin">
                  <FaSpinner size={16} />
                </div>
                Uploading...
              </>
            ) : (
              "Upload File"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
