import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon/Icon";
import { dropdownValues, nextSelectedValues } from "./dropdown-model";

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string | string[];
  placeholder?: string;
  onChange?: (value: string | string[]) => void;
  searchable?: boolean;
  multiSelect?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

interface DropdownState {
  filteredOptions: DropdownOption[];
  isOpen: boolean;
  searchQuery: string;
  selectOption: (option: DropdownOption) => void;
  setIsOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  values: string[];
}

type DropdownStateProps = Pick<
  DropdownProps,
  "multiSelect" | "onChange" | "options" | "value"
>;

type DropdownViewProps = Omit<DropdownProps, "onChange" | "value"> & {
  state: DropdownState;
};

function useOutsideMouseDown(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onOutside();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOutside, ref]);
}

export const Dropdown: React.FC<DropdownProps> = (props) => {
  const state = useDropdownState(props);
  return <DropdownView {...props} state={state} />;
};

function useDropdownState(props: DropdownStateProps): DropdownState {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    dropdownValues(props.value)
  );
  const selection = useDropdownSelection(
    props,
    selectedValues,
    setIsOpen,
    setSelectedValues,
  );
  const menu = { isOpen, searchQuery, setIsOpen, setSearchQuery };
  return dropdownState(props, menu, selection);
}

function useDropdownSelection(
  props: DropdownStateProps,
  selectedValues: string[],
  setIsOpen: (open: boolean) => void,
  setSelectedValues: (values: string[]) => void,
) {
  const values = visibleDropdownValues(props.value, selectedValues);
  return {
    values,
    selectOption: useDropdownSelect(
      props,
      values,
      setIsOpen,
      setSelectedValues,
    ),
  };
}

interface DropdownMenuState {
  isOpen: boolean;
  searchQuery: string;
  setIsOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

function dropdownState(
  props: DropdownStateProps,
  menu: DropdownMenuState,
  selection: ReturnType<typeof useDropdownSelection>,
): DropdownState {
  return {
    filteredOptions: filteredDropdownOptions(
      props.options,
      menu.searchQuery,
    ),
    ...menu,
    ...selection,
  };
}

function visibleDropdownValues(
  value: DropdownProps["value"],
  selectedValues: string[],
) {
  return value === undefined ? selectedValues : dropdownValues(value);
}

function filteredDropdownOptions(options: DropdownOption[], query: string) {
  return options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );
}

function useDropdownSelect(
  props: DropdownStateProps,
  values: string[],
  setIsOpen: (isOpen: boolean) => void,
  setSelectedValues: (values: string[]) => void,
) {
  return (opt: DropdownOption) => {
    if (opt.disabled) return;
    const updated = nextSelectedValues(opt, !!props.multiSelect, values);
    if (!props.multiSelect) setIsOpen(false);
    if (props.value === undefined) setSelectedValues(updated);
    props.onChange?.(props.multiSelect ? updated : updated[0] || "");
  };
}

function DropdownView(props: DropdownViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideMouseDown(containerRef, () => props.state.setIsOpen(false));
  return (
    <DropdownFrame
      className={props.className ?? ""}
      error={props.error}
      label={props.label}
      ref={containerRef}
    >
      <DropdownControl {...props} />
    </DropdownFrame>
  );
}

function DropdownControl(props: DropdownViewProps) {
  const disabled = props.disabled ?? false;
  return (
    <div className="relative">
      <DropdownTriggerSlot disabled={disabled} props={props} />
      <DropdownMenuSlot
        searchable={props.searchable ?? false}
        state={props.state}
      />
    </div>
  );
}

function DropdownTriggerSlot(
  { disabled, props }: { disabled: boolean; props: DropdownViewProps },
) {
  return (
    <DropdownTrigger
      disabled={disabled}
      error={props.error}
      isOpen={props.state.isOpen}
      onClick={() => !disabled && props.state.setIsOpen(!props.state.isOpen)}
    >
      <TriggerContent
        multiSelect={props.multiSelect ?? false}
        options={props.options}
        placeholder={props.placeholder ?? "Select an option..."}
        values={props.state.values}
      />
    </DropdownTrigger>
  );
}

function DropdownMenuSlot({
  searchable,
  state,
}: {
  searchable: boolean;
  state: DropdownState;
}) {
  if (!state.isOpen) return null;
  return (
    <DropdownMenu
      filteredOptions={state.filteredOptions}
      onSearchQueryChange={state.setSearchQuery}
      onSelectOption={state.selectOption}
      searchable={searchable}
      searchQuery={state.searchQuery}
      selectedValues={state.values}
    />
  );
}

const DropdownFrame = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className: string;
    error?: string;
    label?: string;
  }
>(({ children, className, error, label }, ref) => (
  <div
    className={`w-full text-left space-y-1.5 select-none ${className}`}
    ref={ref}
  >
    {label && <DropdownLabel label={label} />}
    {children}
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
));

DropdownFrame.displayName = "DropdownFrame";

function DropdownLabel({ label }: { label: string }) {
  return (
    <label className="block text-xs font-bold text-ink-black uppercase tracking-wider">
      {label}
    </label>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  disabled: boolean;
  error?: string;
  isOpen: boolean;
  onClick: () => void;
}

function DropdownTrigger(props: DropdownTriggerProps) {
  const stateClass = triggerStateClass(
    props.error,
    props.isOpen,
    props.disabled,
  );
  return (
    <DropdownTriggerButton
      content={props.children}
      disabled={props.disabled}
      icon={<DropdownChevron isOpen={props.isOpen} />}
      onClick={props.onClick}
      stateClass={stateClass}
    />
  );
}

interface DropdownTriggerButtonProps {
  content: React.ReactNode;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  stateClass: string;
}

function DropdownTriggerButton(props: DropdownTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer bg-white text-ink-black min-h-[44px] ${props.stateClass}`}
    >
      <div className="flex-1 truncate mr-2">{props.content}</div>
      {props.icon}
    </button>
  );
}

function triggerStateClass(
  error: string | undefined,
  isOpen: boolean,
  disabled: boolean,
) {
  if (disabled) return "opacity-50 cursor-not-allowed bg-canvas-cream";
  if (error) return "border-red-500 ring-1 ring-red-500";
  return isOpen
    ? "border-ink-black ring-2 ring-ink-black/20"
    : "border-dust-taupe/60 hover:border-ink-black";
}

function DropdownChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <Icon
      name="chevronDown"
      size="sm"
      className={`transition-transform duration-200 text-slate-gray ${
        isOpen ? "rotate-180" : ""
      }`}
    />
  );
}

function TriggerContent({
  multiSelect,
  options,
  placeholder,
  values,
}: {
  multiSelect: boolean;
  options: DropdownOption[];
  placeholder: string;
  values: string[];
}) {
  if (values.length === 0) {
    return <span className="text-slate-gray">{placeholder}</span>;
  }
  if (multiSelect) {
    return <SelectedValueChips options={options} values={values} />;
  }
  const selectedOption = options.find((option) => option.value === values[0]);
  return <span>{selectedOption?.label || values[0]}</span>;
}

function SelectedValueChips({
  options,
  values,
}: {
  options: DropdownOption[];
  values: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 bg-ink-black text-canvas-cream text-[11px] font-bold px-2.5 py-0.5 rounded-full"
        >
          {options.find((option) => option.value === value)?.label || value}
        </span>
      ))}
    </div>
  );
}

interface DropdownMenuProps {
  filteredOptions: DropdownOption[];
  onSearchQueryChange: (query: string) => void;
  onSelectOption: (option: DropdownOption) => void;
  searchable: boolean;
  searchQuery: string;
  selectedValues: string[];
}

function DropdownMenu(props: DropdownMenuProps) {
  return (
    <div className="absolute top-full mt-1.5 left-0 w-full rounded-2xl bg-white border border-dust-taupe/60 shadow-level-2 p-2 z-50 max-h-60 overflow-y-auto animate-fadeIn">
      <DropdownSearchSlot
        onSearchQueryChange={props.onSearchQueryChange}
        searchable={props.searchable}
        searchQuery={props.searchQuery}
      />
      <DropdownOptionList
        filteredOptions={props.filteredOptions}
        onSelectOption={props.onSelectOption}
        selectedValues={props.selectedValues}
      />
    </div>
  );
}

function DropdownSearchSlot({
  onSearchQueryChange,
  searchable,
  searchQuery,
}: {
  onSearchQueryChange: (query: string) => void;
  searchable: boolean;
  searchQuery: string;
}) {
  if (!searchable) return null;
  return (
    <DropdownSearchBox onChange={onSearchQueryChange} value={searchQuery} />
  );
}

function DropdownOptionList({
  filteredOptions,
  onSelectOption,
  selectedValues,
}: {
  filteredOptions: DropdownOption[];
  onSelectOption: (option: DropdownOption) => void;
  selectedValues: string[];
}) {
  if (filteredOptions.length === 0) return <DropdownNoResults />;
  return filteredOptions.map((option) => (
    <DropdownOptionRow
      isSelected={selectedValues.includes(option.value)}
      key={option.value}
      onSelectOption={onSelectOption}
      option={option}
    />
  ));
}

function DropdownSearchBox({
  onChange,
  value,
}: {
  onChange: (query: string) => void;
  value: string;
}) {
  return (
    <div className="mb-2 p-1 border-b border-dust-taupe/30">
      <input
        type="text"
        placeholder="Search option..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full text-xs p-2 rounded-lg bg-canvas-cream border border-dust-taupe/40 focus:outline-none focus:border-ink-black"
      />
    </div>
  );
}

function DropdownNoResults() {
  return (
    <div className="p-3 text-xs text-slate-gray text-center">
      No option found
    </div>
  );
}

interface DropdownOptionRowProps {
  isSelected: boolean;
  onSelectOption: (option: DropdownOption) => void;
  option: DropdownOption;
}

function DropdownOptionRow(props: DropdownOptionRowProps) {
  const optionState = optionStateClass(
    props.option.disabled,
    props.isSelected,
  );
  return (
    <div
      onClick={() => props.onSelectOption(props.option)}
      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${optionState}`}
    >
      <span>{props.option.label}</span>
      {props.option.badge && <OptionBadge badge={props.option.badge} />}
      {props.isSelected && !props.option.badge && <OptionCheckmark />}
    </div>
  );
}

function optionStateClass(disabled: boolean | undefined, isSelected: boolean) {
  if (disabled) return "opacity-40 cursor-not-allowed";
  return isSelected
    ? "bg-ink-black text-canvas-cream font-bold"
    : "hover:bg-soft-bone text-ink-black";
}

function OptionBadge({ badge }: { badge: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-signal-orange text-white font-extrabold ml-2">
      {badge}
    </span>
  );
}

function OptionCheckmark() {
  return <Icon name="check" size="sm" className="text-canvas-cream" />;
}
