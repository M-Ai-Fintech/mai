import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon/Icon";

export type CountryCode = "BR" | "ES" | "US";

export interface CountryOption {
  code: CountryCode;
  name: string;
  currency: string;
  flagIcon: "flagBR" | "flagES" | "flagUS";
}

export const COUNTRIES: CountryOption[] = [
  { code: "BR", name: "Brasil", currency: "BRL (R$)", flagIcon: "flagBR" },
  { code: "ES", name: "España", currency: "EUR (€)", flagIcon: "flagES" },
  {
    code: "US",
    name: "United States",
    currency: "USD ($)",
    flagIcon: "flagUS",
  },
];

export interface CountrySelectorProps {
  selectedCountry?: CountryCode;
  onChange?: (country: CountryOption) => void;
  variant?: "dark" | "light";
  className?: string;
}

interface CountrySelectorState {
  current: CountryOption;
  isOpen: boolean;
  close: () => void;
  select: (option: CountryOption) => void;
  toggle: () => void;
}

function countryForCode(code: CountryCode): CountryOption {
  return COUNTRIES.find((country) => country.code === code) || COUNTRIES[0];
}

function useCountrySelectorState(
  selectedCountry: CountryCode,
  onChange: CountrySelectorProps["onChange"],
): CountrySelectorState {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<CountryOption>(
    countryForCode(selectedCountry),
  );
  useSyncedCountry(selectedCountry, setCurrent);
  return {
    current,
    isOpen,
    close: () => setIsOpen(false),
    select: (option: CountryOption) =>
      selectCountry(option, setCurrent, setIsOpen, onChange),
    toggle: () => setIsOpen((open) => !open),
  };
}

function useSyncedCountry(
  selectedCountry: CountryCode,
  setCurrent: (country: CountryOption) => void,
): void {
  useEffect(() => {
    const timer = window.setTimeout(
      () => setCurrent(countryForCode(selectedCountry)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [selectedCountry, setCurrent]);
}

function useCountryOutsideClose(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, ref]);
}

function selectCountry(
  option: CountryOption,
  setCurrent: (option: CountryOption) => void,
  setIsOpen: (open: boolean) => void,
  onChange: CountrySelectorProps["onChange"],
): void {
  setCurrent(option);
  setIsOpen(false);
  onChange?.(option);
}

export const CountrySelector: React.FC<CountrySelectorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const state = useCountrySelectorState(
    props.selectedCountry ?? "BR",
    props.onChange,
  );
  useCountryOutsideClose(containerRef, state.close);
  return (
    <CountrySelectorFrame
      ref={containerRef}
      className={props.className ?? ""}
    >
      <CountrySelectorContent
        state={state}
        variant={props.variant ?? "dark"}
      />
    </CountrySelectorFrame>
  );
};

const CountrySelectorFrame = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className: string }
>(({ children, className }, ref) => (
  <div
    ref={ref}
    className={`relative inline-block text-left select-none ${className}`}
  >
    {children}
  </div>
));

CountrySelectorFrame.displayName = "CountrySelectorFrame";

interface CountrySelectorContentProps {
  state: CountrySelectorState;
  variant: NonNullable<CountrySelectorProps["variant"]>;
}

function CountrySelectorContent(props: CountrySelectorContentProps) {
  return (
    <>
      <CountryTrigger
        current={props.state.current}
        isOpen={props.state.isOpen}
        onClick={props.state.toggle}
        variant={props.variant}
      />
      <CountryMenuSlot state={props.state} variant={props.variant} />
    </>
  );
}

function CountryMenuSlot({
  state,
  variant,
}: {
  state: CountrySelectorState;
  variant: NonNullable<CountrySelectorProps["variant"]>;
}) {
  if (!state.isOpen) return null;
  return (
    <CountryMenu
      current={state.current}
      onSelect={state.select}
      variant={variant}
    />
  );
}

interface CountryTriggerProps {
  current: CountryOption;
  isOpen: boolean;
  onClick: () => void;
  variant: NonNullable<CountrySelectorProps["variant"]>;
}

function CountryTrigger(props: CountryTriggerProps) {
  return (
    <CountryTriggerButton {...props}>
      <CountryTriggerContent current={props.current} />
      <CountryChevron isOpen={props.isOpen} />
    </CountryTriggerButton>
  );
}

type CountryTriggerButtonProps = CountryTriggerProps & {
  children: React.ReactNode;
};

function CountryTriggerButton(props: CountryTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={countryTriggerClass(props.variant)}
      aria-expanded={props.isOpen}
      aria-label={`Current country is ${props.current.name}. Click to change.`}
    >
      {props.children}
    </button>
  );
}

function countryTriggerClass(
  variant: NonNullable<CountrySelectorProps["variant"]>,
) {
  return `inline-flex min-h-11 items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-orange ${
    triggerVariantClass(variant)
  }`;
}

function CountryTriggerContent({ current }: { current: CountryOption }) {
  return (
    <>
      <Icon name={current.flagIcon} size="md" />
      <span>{current.name}</span>
      <span className="opacity-60 text-[10px]">({current.currency})</span>
    </>
  );
}

function triggerVariantClass(
  variant: NonNullable<CountrySelectorProps["variant"]>,
) {
  if (variant === "dark") {
    return "bg-ink-black text-canvas-cream border-dust-taupe/30 hover:border-canvas-cream/60";
  }
  return "bg-white text-ink-black border-dust-taupe/60 hover:border-ink-black shadow-sm";
}

function CountryChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <Icon
      name="chevronDown"
      size="sm"
      className={`transition-transform duration-200 ${
        isOpen ? "rotate-180" : ""
      }`}
    />
  );
}

interface CountryMenuProps {
  current: CountryOption;
  onSelect: (option: CountryOption) => void;
  variant: NonNullable<CountrySelectorProps["variant"]>;
}

function CountryMenu(props: CountryMenuProps) {
  return (
    <div
      className={`absolute bottom-full mb-2 right-0 w-56 rounded-2xl shadow-level-2 border p-1.5 z-50 animate-fadeIn ${
        menuVariantClass(props.variant)
      }`}
    >
      <CountryMenuHeader />
      <CountryMenuOptions
        current={props.current}
        isDark={props.variant === "dark"}
        onSelect={props.onSelect}
      />
    </div>
  );
}

function CountryMenuHeader() {
  return (
    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dust-taupe">
      Select Region & Currency
    </div>
  );
}

function CountryMenuOptions({
  current,
  isDark,
  onSelect,
}: {
  current: CountryOption;
  isDark: boolean;
  onSelect: (option: CountryOption) => void;
}) {
  return COUNTRIES.map((option) => (
    <CountryMenuOption
      isDark={isDark}
      isSelected={option.code === current.code}
      key={option.code}
      onSelect={onSelect}
      option={option}
    />
  ));
}

function menuVariantClass(
  variant: NonNullable<CountrySelectorProps["variant"]>,
) {
  return variant === "dark"
    ? "bg-ink-black border-dust-taupe/30 text-canvas-cream"
    : "bg-white border-dust-taupe/60 text-ink-black";
}

interface CountryMenuOptionProps {
  isDark: boolean;
  isSelected: boolean;
  onSelect: (option: CountryOption) => void;
  option: CountryOption;
}

function CountryMenuOption(props: CountryMenuOptionProps) {
  return (
    <button
      key={props.option.code}
      onClick={() => props.onSelect(props.option)}
      className={`flex min-h-11 w-full items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
        countryOptionClass(props.isSelected, props.isDark)
      }`}
    >
      <CountryOptionName option={props.option} />
      <CountryOptionCurrency
        isSelected={props.isSelected}
        option={props.option}
      />
    </button>
  );
}

function CountryOptionCurrency({
  isSelected,
  option,
}: {
  isSelected: boolean;
  option: CountryOption;
}) {
  const color = isSelected ? "text-white" : "text-dust-taupe";
  return <span className={`${color} text-[10px]`}>{option.currency}</span>;
}

function countryOptionClass(isSelected: boolean, isDark: boolean) {
  if (isSelected) return "bg-signal-orange text-white font-bold";
  return isDark
    ? "hover:bg-white/10 text-canvas-cream/90"
    : "hover:bg-soft-bone text-ink-black";
}

function CountryOptionName({ option }: { option: CountryOption }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={option.flagIcon} size="md" />
      <span>{option.name}</span>
    </div>
  );
}
