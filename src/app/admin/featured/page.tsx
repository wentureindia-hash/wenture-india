"use client";

import React, { useState } from "react";
import { FEATURED_DATA, FeaturedItem } from "@/lib/constants/featured";

type FeaturedTab = "businesses" | "startups" | "franchises" | "dealerships" | "exim";

const TAB_CONFIG: { key: FeaturedTab; label: string; icon: string }[] = [
  { key: "businesses", label: "Featured Businesses", icon: "domain" },
  { key: "startups", label: "Featured Startups", icon: "rocket_launch" },
  { key: "franchises", label: "Franchise Companies", icon: "store" },
  { key: "dealerships", label: "Dealerships", icon: "local_shipping" },
  { key: "exim", label: "EXIM Companies", icon: "public" },
];

export default function AdminFeaturedContentPage() {
  const [activeTab, setActiveTab] = useState<FeaturedTab>("businesses");
  const [itemsMap, setItemsMap] = useState<Record<string, FeaturedItem[]>>(FEATURED_DATA);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item inputs
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [sector, setSector] = useState("Technology");
  const [location, setLocation] = useState("");
  const [investmentRange, setInvestmentRange] = useState("₹25L – ₹50L");
  const [shortDescription, setShortDescription] = useState("");
  const [tag, setTag] = useState("");

  const currentItems = itemsMap[activeTab] || [];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortDescription.trim()) return;

    const newItem: FeaturedItem = {
      id: `feat-${activeTab}-${Date.now()}`,
      name: name.trim(),
      category: "Featured Business",
      type: type.trim() || "Featured Venture",
      sector: sector.trim(),
      location: location.trim() || "India",
      investmentRange,
      shortDescription: shortDescription.trim(),
      opportunityType: "Curated Showcase",
      imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      tag: tag.trim() || "Featured Selection",
    };

    setItemsMap((prev) => ({
      ...prev,
      [activeTab]: [newItem, ...prev[activeTab]],
    }));

    setName("");
    setType("");
    setLocation("");
    setShortDescription("");
    setTag("");
    setShowAddModal(false);
  };

  const handleRemoveItem = (id: string) => {
    if (!confirm("Are you sure you want to remove this featured item?")) return;
    setItemsMap((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((i) => i.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Curated Highlights
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] tracking-tight font-heading">
            Featured Content Management
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Manage featured companies, high-growth startups, franchise brands, and export ventures displayed on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 self-stretch sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Featured Item</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-[#DCECF2] rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[#00A6E8] text-white shadow-sm"
                : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-[#5F7180]"
              }`}
            >
              {(itemsMap[tab.key] || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {currentItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#DCECF2] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
                    {item.type}
                  </span>
                  {item.tag && (
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {item.tag}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#0A192A] mb-1 font-heading">{item.name}</h3>
                <p className="text-xs text-[#5F7180] line-clamp-2 mb-4 leading-relaxed">{item.shortDescription}</p>

                <div className="text-[11px] space-y-1 text-[#5F7180] pt-3 border-t border-slate-100 mb-4">
                  <div className="flex justify-between">
                    <span>Sector:</span>
                    <strong className="text-[#0A192A]">{item.sector}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <strong className="text-[#0A192A]">{item.location}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Investment:</span>
                    <strong className="text-[#0A192A]">{item.investmentRange}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[#DCECF2]">
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-[#DCECF2] rounded-2xl p-8">
          <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2 block">
            featured_play_list
          </span>
          <h3 className="text-base font-bold text-[#0A192A] mb-1">
            No featured items in this section
          </h3>
          <p className="text-xs text-[#5F7180] mb-4">
            Click &quot;Add Featured Item&quot; above to feature an approved business or venture in this tab.
          </p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-[#DCECF2] rounded-2xl shadow-2xl p-4 sm:p-6 my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#0A192A] font-heading mb-4">
              Add Item to {TAB_CONFIG.find((t) => t.key === activeTab)?.label}
            </h3>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0A192A] mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zenith Diagnostics"
                  className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Venture Subtype *</label>
                  <input
                    type="text"
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="e.g. Healthcare Unit"
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Sector *</label>
                  <input
                    type="text"
                    required
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. New Delhi, India"
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Investment Range *</label>
                  <input
                    type="text"
                    required
                    value={investmentRange}
                    onChange={(e) => setInvestmentRange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0A192A] mb-1">Highlight Tag (Optional)</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. High Footfall, ISO Certified"
                  className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0A192A] mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Summary of traction and opportunity..."
                  className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#5F7180] hover:bg-slate-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 sm:py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
