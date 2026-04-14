import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | InCaseOf",
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="legal__container">
        <a href="/" className="legal__back">&larr; Back to InCaseOf</a>
        <h1 className="legal__title">Privacy Policy</h1>
        <p className="legal__updated">Last updated: 14 April 2026</p>

        <section className="legal__section">
          <h2>What InCaseOf does</h2>
          <p>
            InCaseOf is a free emergency contact kit that helps you organise your
            emergency information (contacts, medical details, insurance, documents,
            and personal wishes) and share it with people you trust.
          </p>
        </section>

        <section className="legal__section">
          <h2>Where your data is stored</h2>
          <p>
            All your data is stored in <strong>your own Google Drive</strong> account,
            inside a folder called &ldquo;InCaseOf Emergency Kit&rdquo;. We do not store,
            copy, or retain any of your personal information on our servers.
          </p>
          <p>
            Your data is encrypted with a PIN you choose. The encryption and decryption
            happen entirely in your browser. We never see your PIN or your unencrypted data.
          </p>
        </section>

        <section className="legal__section">
          <h2>Google account access</h2>
          <p>
            When you sign in with Google, we request the <code>drive.file</code> scope.
            This is the narrowest Google Drive permission available. It only allows us to
            read and write files that <em>our app created</em>. We cannot see or access
            any other files in your Google Drive.
          </p>
          <p>We use your Google account information (name, email, profile picture) solely
            to personalise your experience within the app. We do not share this information
            with third parties.</p>
        </section>

        <section className="legal__section">
          <h2>What we collect</h2>
          <p>We collect <strong>nothing</strong>. Specifically:</p>
          <ul>
            <li>No analytics or tracking scripts</li>
            <li>No cookies beyond the encrypted session cookie required for authentication</li>
            <li>No personal data stored on our servers</li>
            <li>No data shared with or sold to third parties</li>
          </ul>
        </section>

        <section className="legal__section">
          <h2>Session cookie</h2>
          <p>
            We use a single encrypted, httpOnly cookie (<code>incase_session</code>) to
            maintain your login session. This cookie contains your encrypted Google OAuth
            tokens and is automatically deleted when you sign out. It is never shared with
            third parties.
          </p>
        </section>

        <section className="legal__section">
          <h2>Sharing your emergency information</h2>
          <p>
            When you choose to share your emergency kit, we set the Google Drive folder
            permissions to &ldquo;anyone with the link can view.&rdquo; Your emergency
            contact will need both the link and your 6-digit PIN to decrypt and view the
            information. You can revoke access at any time by changing the folder
            permissions in Google Drive.
          </p>
        </section>

        <section className="legal__section">
          <h2>Data deletion</h2>
          <p>
            Since all data lives in your Google Drive, you have full control. To delete
            your data, simply delete the &ldquo;InCaseOf Emergency Kit&rdquo; folder from
            your Google Drive. You can also revoke our app&rsquo;s access at{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>.
          </p>
        </section>

        <section className="legal__section">
          <h2>Children</h2>
          <p>
            InCaseOf is not directed at children under 13. We do not knowingly collect
            information from children.
          </p>
        </section>

        <section className="legal__section">
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this
            page with an updated date.
          </p>
        </section>

        <section className="legal__section">
          <h2>Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:hello@tryincaseof.com">hello@tryincaseof.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
