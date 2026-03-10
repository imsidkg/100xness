import { useState } from "react";
import { X, DollarSign, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "../../config/api";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000];

const DepositModal = ({ isOpen, onClose, token, onSuccess }: DepositModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(API_ENDPOINTS.DEPOSIT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Deposit failed");
        return;
      }

      setSuccess(
        `Successfully deposited $${numAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. New balance: $${Number(data.balance).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
      setAmount("");
      onSuccess();

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleDeposit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-[400px] rounded-lg overflow-hidden"
        style={{ backgroundColor: "#141D23" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3F474C]">
          <h2 className="text-[16px] font-semibold text-white">Deposit Funds</h2>
          <div
            className="cursor-pointer text-[#6b7280] hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Amount input */}
          <label className="block text-[12px] text-[#9ca3af] font-medium mb-2 uppercase tracking-wide">
            Amount (USD)
          </label>
          <div className="relative">
            <DollarSign
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              className="w-full pl-9 pr-4 py-3 rounded-md text-[15px] font-medium text-white placeholder-[#4a5568] outline-none transition-colors"
              style={{
                backgroundColor: "#141D23",
                border: "1px solid #3F474C",
              }}
            />
          </div>

          {/* Preset amounts */}
          <div className="flex gap-2 mt-3">
            {PRESET_AMOUNTS.map((preset) => (
              <div
                key={preset}
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className="flex-1 text-center py-1.5 rounded text-[12px] font-medium cursor-pointer select-none transition-colors text-[#9ca3af] hover:text-white"
                style={{
                  backgroundColor:
                    amount === String(preset) ? "#2a3640" : "#141D23",
                  border: "1px solid #3F474C",
                }}
              >
                ${preset.toLocaleString()}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 text-[13px] text-red-400">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="mt-3 text-[13px] text-[#00c853]">{success}</p>
          )}

          {/* Deposit button */}
          <div
            onClick={!loading ? handleDeposit : undefined}
            className={`mt-5 w-full py-3 rounded-md text-center text-[14px] font-semibold cursor-pointer select-none transition-colors ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:brightness-110"
            }`}
            style={{
              backgroundColor: "#00c853",
              color: "#fff",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </span>
            ) : (
              `Deposit${
                amount && parseFloat(amount) > 0
                  ? ` $${parseFloat(amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : ""
              }`
            )}
          </div>

          {/* Info text */}
          <p className="mt-3 text-[11px] text-[#6b7280] text-center">
            Funds will be added to your demo account instantly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
