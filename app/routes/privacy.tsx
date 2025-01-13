export function meta() {
  return [
    { title: "Privacy Policy | Supernova AI Playground" },
    {
      name: "description",
      content: "Privacy policy for Supernova AI's open source playground.",
    },
  ];
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <article className="prose prose-neutral dark:prose-invert mx-auto">
          <h1>Privacy Policy</h1>

          <p className="lead">
            We believe privacy policies should be easy to understand. Here's how
            we handle your data.
          </p>

          <h2>Data We Collect</h2>

          <ul>
            <li>
              <strong>Account data:</strong> Email and name from Google when you
              sign in
            </li>
            <li>
              <strong>Playground data:</strong> Your prompts and the AI
              responses
            </li>
            <li>
              <strong>Usage data:</strong> Basic analytics to improve the
              product
            </li>
          </ul>

          <h2>How We Use It</h2>

          <ul>
            <li>
              <strong>Authentication:</strong> To keep your playground data
              private
            </li>
            <li>
              <strong>Functionality:</strong> To make the playground work
            </li>
            <li>
              <strong>Improvements:</strong> To make the product better
            </li>
          </ul>

          <h2>Data Storage</h2>

          <p>
            Your data is stored securely. Since this is an open source tool you
            can host yourself, you have full control over where your data lives.
          </p>

          <h2>Third Parties</h2>

          <ul>
            <li>
              <strong>AI Providers:</strong> Your prompts are sent to the AI
              providers you choose (OpenAI, Anthropic, etc.)
            </li>
            <li>
              <strong>Google Auth:</strong> Used only for signing in
            </li>
          </ul>

          <h2>Your Rights</h2>

          <p>You can:</p>

          <ul>
            <li>Ask us to delete your account and data</li>
            <li>Host your own instance for complete control</li>
          </ul>

          <h2>Questions?</h2>

          <p>
            Email us at{" "}
            <a href="mailto:anirudh@gosupernova.live">
              anirudh@gosupernova.live
            </a>{" "}
            or{" "}
            <a href="https://github.com/supernova-app/ai-playground/issues">
              open an issue
            </a>{" "}
            on GitHub.
          </p>

          <div className="not-prose mt-8 text-sm text-muted-foreground">
            Last updated: 13 Jan 2025
          </div>
        </article>
      </div>
    </div>
  );
}
