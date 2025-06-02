import React from 'react';

/**
 * @template ButtonProps
 * Defines the properties for the AI-generatable Button component.
 * This template is intended to be used by a hypothetical AI for code generation.
 * The AI would fill in or select values for these props based on user requirements.
 */
export interface ButtonProps {
  /** The text content to be displayed inside the button. */
  text?: string;
  /** Function to be called when the button is clicked. */
  onClick?: () => void;
  /**
   * The visual style of the button.
   * - 'primary': Main action button.
   * - 'secondary': Alternative action button.
   * - 'danger': For destructive actions.
   * - 'ghost': Minimal styling, often for less prominent actions.
   * - 'link': Styles like a hyperlink.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  /** Optional unique identifier for the button. */
  id?: string;
  /** Optional additional CSS classes for custom styling. */
  className?: string;
  /** If true, the button will be disabled. */
  disabled?: boolean;
  /** The type of the button (e.g., 'button', 'submit', 'reset'). Defaults to 'button'. */
  type?: 'button' | 'submit' | 'reset';
  // Add other relevant props like 'icon', 'size', etc. as needed by the platform
}

/**
 * @template AiButton
 * A basic, AI-generatable Button component.
 * This template serves as a foundational UI element that an AI can customize and integrate
 * into generated application UIs. The AI would select appropriate props based on context.
 *
 * Example (conceptual AI instruction):
 * "Create a primary button with text 'Submit Form' that triggers the form submission."
 * AI might generate: <AiButton text="Submit Form" variant="primary" type="submit" />
 */
const AiButton: React.FC<ButtonProps> = ({
  text = 'Button',
  onClick,
  variant = 'primary',
  id,
  className = '',
  disabled = false,
  type = 'button',
  // children can also be used if text prop is not preferred
}) => {
  // Basic styling based on variant (conceptual, would be replaced by actual CSS classes)
  const baseStyle = "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50";
  let variantStyle = "";

  switch (variant) {
    case 'primary':
      variantStyle = "bg-blue-500 hover:bg-blue-700 text-white";
      break;
    case 'secondary':
      variantStyle = "bg-gray-500 hover:bg-gray-700 text-white";
      break;
    case 'danger':
      variantStyle = "bg-red-500 hover:bg-red-700 text-white";
      break;
    case 'ghost':
      variantStyle = "bg-transparent hover:bg-gray-200 text-gray-700 border border-gray-300";
      break;
    case 'link':
      variantStyle = "bg-transparent text-blue-500 hover:underline";
      break;
    default:
      variantStyle = "bg-blue-500 hover:bg-blue-700 text-white";
      break;
  }

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {text}
    </button>
  );
};

export default AiButton;

/*
Note for AI Platform Development:
- This component template is a starting point.
- The actual styling (`baseStyle`, `variantStyle`) should be connected to a proper
  design system or utility CSS classes (like Tailwind CSS if used in the generated project).
- The AI should be taught how to map user intents to these props.
- Consider adding more props for icons, sizes, loading states, etc.
- The AI should also be able to generate necessary `onClick` handlers or integrate
  with other generated logic.
*/
my-remix-app/app/components/ai-library/Card.template.tsx
import React from 'react';

/**
 * @template CardProps
 * Defines the properties for the AI-generatable Card component.
 * This template is intended to be used by a hypothetical AI for code generation.
 */
export interface CardProps {
  /** Optional title to be displayed at the top of the card. */
  title?: string;
  /** The content of the card. Can be any valid React node. */
  children: React.ReactNode;
  /** Optional unique identifier for the card. */
  id?: string;
  /** Optional additional CSS classes for custom styling. */
  className?: string;
  /** Optional CSS classes for the card's header/title section. */
  headerClassName?: string;
  /** Optional CSS classes for the card's body/content section. */
  bodyClassName?: string;
  // Add other relevant props like 'footerContent', 'elevation', 'variant' etc.
}

/**
 * @template AiCard
 * A basic, AI-generatable Card component.
 * This template serves as a container element that an AI can use to structure content
 * within generated application UIs.
 *
 * Example (conceptual AI instruction):
 * "Display the user's profile information in a card titled 'User Profile'."
 * AI might generate:
 * <AiCard title="User Profile">
 *   <UserProfileDetails userId={currentUser.id} />
 * </AiCard>
 */
const AiCard: React.FC<CardProps> = ({
  title,
  children,
  id,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) => {
  // Basic styling (conceptual, would be replaced by actual CSS classes)
  const baseStyle = "border rounded-lg shadow-md overflow-hidden";
  const headerStyle = "p-4 border-b bg-gray-50";
  const titleStyle = "text-xl font-semibold";
  const bodyStyle = "p-4";

  return (
    <div id={id} className={`${baseStyle} ${className}`}>
      {title && (
        <div className={`${headerStyle} ${headerClassName}`}>
          <h3 className={titleStyle}>{title}</h3>
        </div>
      )}
      <div className={`${bodyStyle} ${bodyClassName}`}>
        {children}
      </div>
      {/* Optionally, a footer section could be added here based on props */}
    </div>
  );
};

export default AiCard;

/*
Note for AI Platform Development:
- This Card component is a structural template.
- Styling should be integrated with a design system (e.g., Tailwind CSS).
- The AI should be able to place other generated components or content within the `children` prop.
- Consider props for actions (e.g., an array of buttons for the footer), loading states,
  different card variants (e.g., outlined, elevated).
*/
