import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function NotFoundPage() {
  return (
    <Layout>
      <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
      <Link to="/" className="text-indigo-600 dark:text-indigo-400">
        Back to papers
      </Link>
    </Layout>
  );
}
