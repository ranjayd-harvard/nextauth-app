export default function About() {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">About Us</h1>
          <p className="text-gray-600 mb-4">
            This is another unprotected page that anyone can access without logging in.
          </p>
          <p className="text-gray-600">
            Our app demonstrates NextAuth.js integration with Google and GitHub providers,
            featuring both protected and unprotected routes using the App Router.
          </p>
        </div>
      </div>
    )
  }
  