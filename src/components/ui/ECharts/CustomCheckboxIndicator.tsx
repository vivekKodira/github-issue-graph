import { Box } from "@chakra-ui/react";
import { useEffect } from "react";

let styleInjected = false;

export const CustomCheckboxIndicator = ({ checked }: { checked: boolean }) => {
  useEffect(() => {
    if (!styleInjected) {
      const style = document.createElement("style");
      style.innerHTML = `
        .reviewer-checkbox-indicator {
          transition: background 0.2s, border-color 0.2s;
        }
        .reviewer-checkbox-indicator.checked {
          background: #3182ce !important;
          border-color: #63b3ed !important;
        }
        .reviewer-checkbox-indicator.unchecked {
          background: #2d3748 !important;
          border-color: #718096 !important;
        }
        .custom-checkbox-checkmark {
          display: none !important;
        }
        .reviewer-checkbox-indicator.checked .custom-checkbox-checkmark {
          display: block !important;
        }
      `;
      document.head.appendChild(style);
      styleInjected = true;
    }
  }, []);

  return (
    <Box
      as="span"
      display="inline-block"
      width="20px"
      height="20px"
      borderRadius="md"
      border="2px solid"
      className={`reviewer-checkbox-indicator ${checked ? "checked" : "unchecked"}`}
      position="relative"
      marginLeft="8px"
    >
      <Box
        as="span"
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        color="white"
        fontSize="md"
        fontWeight="bold"
        className="custom-checkbox-checkmark"
      >
        ✓
      </Box>
    </Box>
  );
}; 