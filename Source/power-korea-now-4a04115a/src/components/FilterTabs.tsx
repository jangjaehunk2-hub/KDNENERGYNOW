interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterTabs = ({ activeFilter, onFilterChange }: FilterTabsProps) => {
  const filters = [
    { id: "all", label: "전체" },
    { id: "solar", label: "태양광" },
    { id: "hydro", label: "수력" },
    { id: "wind", label: "풍력" },
    { id: "nuclear", label: "원자력" },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              px-6 py-2.5 rounded-lg font-medium transition-all duration-200
              border-2
              ${
                isActive
                  ? "bg-[hsl(var(--accent))] border-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-md"
                  : "bg-card border-border text-foreground hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--sidebar-hover))]"
              }
            `}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
