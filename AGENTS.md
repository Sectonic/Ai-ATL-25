# Agent Guidelines for Code Quality

## Philosophy

Code should be fully readable without comments. Components should be clean, focused, and properly separated. Design should be minimal and elegant.

## Core Principles

### 1. Self-Documenting Code - No Comments

**Comments are prohibited.**

Code clarity comes from descriptive naming, focused functions, and meaningful abstractions. If you need a comment, refactor the code instead.

❌ Bad:
```typescript
// Get user data
const getData = (id: string) => fetch(`/api/${id}`);
```

✅ Good:
```typescript
const fetchUserById = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};
```

### 2. Component Separation

Each component should have a single, clear purpose. Maximum ~150 lines per component.

**Extract:**
- Complex logic into custom hooks
- Repeated patterns into utilities
- Sub-sections into child components

❌ Bad (bloated with manual data fetching):
```typescript
const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(/* logic */);
        setData(filtered);
        setLoading(false);
      });
  }, []);
  
  return <div>{/* massive JSX */}</div>;
};
```

✅ Good (separated with TanStack Query):
```typescript
const fetchDashboardData = async (): Promise<DataItem[]> => {
  const response = await fetch('/api/data');
  return response.json();
};

const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });
};

const Dashboard = () => {
  const { data, isLoading } = useDashboardData();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <DashboardLayout>
      <DataGrid data={data} />
    </DashboardLayout>
  );
};
```

### 3. Modern React Patterns

- Functional components only
- Custom hooks for reusable logic
- TypeScript for type safety
- **TanStack React Query for all data fetching** - never use fetch directly in components

### 4. Data Fetching with TanStack Query

**Never use fetch directly in components.**

Separate API functions, use descriptive query keys, handle all states.

```typescript
const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
  });
};

const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, isLoading, error } = useUser(userId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{user.name}</div>;
};
```

### 5. Apple-Inspired Design

Use **shadcn/ui** as the primary component library. Design should be minimal, sleek, with smooth animations.

**Visual Principles:**
- Generous whitespace
- Neutral colors with subtle accents
- Soft shadows, rounded corners
- System fonts, clear hierarchy

**Animation Guidelines:**
- 150-300ms transitions
- Ease-in-out curves
- Purposeful motion only
- No gratuitous effects

```typescript
const Panel = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    className="rounded-xl shadow-sm"
  >
    {/* content */}
  </motion.div>
);
```

**What to animate:**
- Modal appearances
- Panel transitions
- Button hover states
- Loading states

**What to avoid:**
- Heavy shadows
- Excessive gradients
- Over-animation
- Cluttered layouts

## Naming Conventions

- Components: `PascalCase` - `EventMarker`, `DataGrid`
- Hooks: `camelCase` with `use` prefix - `useSimulation`, `useDashboardData`
- Functions: verb prefix - `fetchUserData`, `transformEvent`
- Variables: descriptive - `activeEvents`, `isLoading`

## Component Structure

```typescript
const Component = () => {
  // 1. Hooks (state, queries, mutations)
  const [state, setState] = useState();
  const { data, isLoading } = useQuery(...);
  
  // 2. Derived values
  const derivedValue = useMemo(() => compute(state), [state]);
  
  // 3. Event handlers
  const handleClick = useCallback(() => {
    setState(newValue);
  }, []);
  
  // 4. Early returns
  if (isLoading) return <LoadingSpinner />;
  
  // 5. Main render
  return <div>...</div>;
};
```

## When to Refactor

Refactor immediately when:
- Component exceeds 150 lines
- Logic mixed with rendering
- Unclear naming
- Multiple concerns in one component

---

**Remember**: Prioritize clarity and simplicity above all else.
