"use client";

import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { CreatePostSchema } from "@acme/types";
import { cn } from "@acme/ui/lib/utils";
import { Button } from "@acme/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/components/field";
import { Input } from "@acme/ui/components/input";
import { toast } from "sonner";

import { useTRPC } from "../trpc/react";

export function CreatePostForm() {
  const trpc = useTRPC();

  const queryClient = useQueryClient();
  const createPost = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        await queryClient.invalidateQueries(trpc.post.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to post"
            : "Failed to create post",
        );
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      content: "",
      title: "",
    },
    validators: {
      onSubmit: CreatePostSchema,
    },
    onSubmit: (data) => createPost.mutate(data.value),
  });

  return (
    <form
      className="w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="title"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Title"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="content"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Content"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
      <Button type="submit" className="mt-4">Create</Button>
    </form>
  );
}

export function PostList() {
  const trpc = useTRPC();
  const { data: posts } = useSuspenseQuery(trpc.post.all.queryOptions());

  if (posts.length === 0) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <PostCardSkeleton pulse={false} />
        <PostCardSkeleton pulse={false} />
        <PostCardSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No posts yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {posts.map((p) => {
        return <PostCard key={p.id} post={p} />;
      })}
    </div>
  );
}

export function PostCard(props: {
  post: RouterOutputs["post"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deletePost = useMutation(
    trpc.post.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.post.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to delete a post"
            : "Failed to delete post",
        );
      },
    }),
  );

  return (
    <Card className="group relative overflow-hidden bg-card/80 backdrop-blur-sm transition-all">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="grow space-y-2">
          <CardTitle className="text-primary text-xl leading-tight">
            {props.post.title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {props.post.content}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive shrink-0 hover:bg-destructive/10 dark:hover:bg-destructive/10"
          onClick={() => deletePost.mutate(props.post.id)}
        >
          Delete
        </Button>
      </CardHeader>
    </Card>
  );
}

export function PostCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="grow space-y-3">
          <div
            className={cn(
              "bg-primary/20 h-6 w-1/3 rounded-md",
              pulse && "animate-pulse",
            )}
          />
          <div
            className={cn(
              "bg-muted-foreground/20 h-4 w-2/3 rounded-md",
              pulse && "animate-pulse",
            )}
          />
        </div>
        <div
          className={cn(
            "bg-muted/50 h-8 w-16 shrink-0 rounded-md",
            pulse && "animate-pulse",
          )}
        />
      </CardHeader>
    </Card>
  );
}
