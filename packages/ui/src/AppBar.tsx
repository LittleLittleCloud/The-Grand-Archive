import type { User } from "@dak/contract";

export function AppBar({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6">
          <a
            href="#/"
            className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
          >
            大案牍库
          </a>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <a
              href="#/"
              className="text-gray-600 hover:text-indigo-600 transition"
            >
              Home
            </a>
            <a
              href="#/search"
              className="text-gray-600 hover:text-indigo-600 transition"
            >
              Search
            </a>
          </nav>
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <a
                href="#/api-keys"
                className="text-gray-600 hover:text-indigo-600 transition"
              >
                API Keys
              </a>
              <span className="text-gray-600">{user.username}</span>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="#/login"
              className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
