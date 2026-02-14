import React from 'react';

// Mock all commonly used Chakra UI components
export const Box = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Stack = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const HStack = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const VStack = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
export const Heading = ({ children, ...props }: any) => <h1 {...props}>{children}</h1>;
export const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const Input = (props: any) => <input {...props} />;

// Mock Chakra v3 Select component with new API
export const Select = Object.assign(
  ({ children, ...props }: any) => <select {...props}>{children}</select>,
  {
    Root: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Trigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Content: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Item: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    ValueText: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    HiddenSelect: () => <select style={{ display: 'none' }} />,
    Control: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    IndicatorGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Indicator: () => <span>▼</span>,
    Positioner: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    ItemIndicator: ({ children, ...props }: any) => <div {...props}>{typeof children === 'function' ? children({ 'data-state': 'unchecked' }) : children}</div>,
  }
);

// Mock Field component
export const Field = Object.assign(
  ({ children, ...props }: any) => <div {...props}>{children}</div>,
  {
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    HelperText: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    ErrorText: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  }
);
export const Checkbox = (props: any) => <input type="checkbox" {...props} />;
export const Radio = (props: any) => <input type="radio" {...props} />;
export const Flex = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Grid = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const SimpleGrid = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Textarea = (props: any) => <textarea {...props} />;
export const Table = Object.assign(
  ({ children, ...props }: any) => <table {...props}>{children}</table>,
  {
    Root: ({ children, ...props }: any) => <table {...props}>{children}</table>,
    Header: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
    Body: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
    Row: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
    Cell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
    ColumnHeader: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  }
);
export const IconButton = (props: any) => <button {...props} />;
export const Spinner = () => <div>Loading...</div>;
export const Center = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const Pagination = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ButtonGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;

// Mock hooks
export const useColorMode = () => ({ colorMode: 'light', toggleColorMode: jest.fn() });
export const useColorModeValue = (light: any, dark: any) => light;
export const useDisclosure = () => ({ isOpen: false, onOpen: jest.fn(), onClose: jest.fn(), onToggle: jest.fn() });

// Mock Chakra UI utilities
export const createListCollection = (config: any) => ({
  items: config.items || [],
  ...config
});

// Mock Toaster
export const Toaster = () => <div data-testid="toaster-mock" />;
export const createToaster = () => ({
  create: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  promise: jest.fn(),
  update: jest.fn(),
});

// Mock Portal
export const Portal = ({ children }: any) => <>{children}</>;

// Mock other Chakra utilities that might be used
export const chakra = (component: any) => component;
export const forwardRef = (component: any) => component;
