import { json, type MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Gobeze AI" },
    { name: "description", content: "Talk with Gobeze AI, your AI assistant" }
  ];
};

export const loader = () => json({});

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Gobeze AI</h1>
      <p>This is a minimal setup to get started.</p>
    </div>
  );
}
