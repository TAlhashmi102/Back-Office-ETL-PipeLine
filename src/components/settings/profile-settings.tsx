"use client";

import { Check, Upload, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";

type ProfileSettingsProps = {
  fullName: string;
  phone: string;
  address: string;
};

export function ProfileSettings({ fullName, phone, address }: ProfileSettingsProps) {
  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [userAddress, setUserAddress] = useState(address);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file to preview your profile picture.");
      event.target.value = "";
      return;
    }
    setMessage("");
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Profile details saved for this session. Connect a profile storage bucket to persist them.");
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal details and profile picture.
        </p>
      </div>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary ring-1 ring-border">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Selected profile picture preview" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Profile picture</p>
            <p className="mt-1 text-xs text-muted-foreground">Choose an image to preview it here.</p>
            <label className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted">
              <Upload className="h-3.5 w-3.5" />
              Select image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="sr-only"
                aria-label="Upload profile picture"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Full name
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Your full name"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Phone number
            <input
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="+44 0000 000000"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Address
            <textarea
              autoComplete="street-address"
              value={userAddress}
              onChange={(event) => setUserAddress(event.target.value)}
              rows={3}
              className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Street, city, postal code"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {message ? (
            <p role="status" className="inline-flex items-center gap-1.5 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              {message}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Profile changes are currently saved in this session only.
            </p>
          )}
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}
