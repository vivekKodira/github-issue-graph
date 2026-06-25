import { useState, useEffect, useRef, useCallback } from "react";
import { SetupWizard } from "@/components/ui/Setup/SetupWizard";
import { FetchingStep } from "@/components/ui/Setup/FetchingStep";
import { QuestionList } from "@/components/ui/Questions/QuestionList";
import { AnswerView } from "@/components/ui/Questions/AnswerView";
import { useRepoData } from "@/context/RepoDataContext";
import type { RepoConfig } from "@/context/RepoDataContext";
import { getQuestion } from "@/config/questions";
import {
  readQuestionFromHash,
  writeAnswerHash,
  writeListHash,
  rememberLastQuestion,
} from "@/util/answerHash";

export type Step = "setup" | "fetching" | "questions" | "answer";

interface AppShellProps {
  config: RepoConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addConfiguration: (cfg: any) => Promise<void> | void;
}

const configIsComplete = (c: RepoConfig): boolean =>
  Boolean(c.repoOwner && (c.repository || c.project) && c.githubToken);

/**
 * The question-driven shell. Owns a small step state machine:
 *   setup → fetching → questions → answer
 *
 * setup    → SetupWizard
 * fetching → FetchingStep (full-screen status + error/retry)
 * questions→ QuestionList (the hub)
 * answer   → AnswerView (one question → one chart)
 *
 * The current view is mirrored to the URL hash (`#/q/<id>` for an answer, `#/`
 * for the list) so answers are shareable, refresh-safe, and back/forward works.
 * When config already exists we auto-fetch on load (cache makes this cheap) and
 * route to the hash target, so a refresh returns to where you were.
 */
export function AppShell({ config, addConfiguration }: AppShellProps) {
  const { fetch, loading, hasFetched, error, flags, isDbReady } = useRepoData();

  const hasConfig = configIsComplete(config);
  const [step, setStep] = useState<Step>(() => (hasConfig ? "fetching" : "setup"));
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  // Where to land after the initial fetch (from a deep-link hash).
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(() =>
    readQuestionFromHash()
  );
  const fetchStartedRef = useRef(false);

  // Kick off the fetch once we land on the fetching step — but only after the
  // RxDB instance is ready. fetch() bails early when the DB isn't ready, so
  // starting before that would mark the fetch "started" yet leave us stuck on
  // the fetching screen with no retry.
  useEffect(() => {
    if (step !== "fetching" || fetchStartedRef.current || !isDbReady) return;
    fetchStartedRef.current = true;
    void fetch();
  }, [step, fetch, isDbReady]);

  // After a successful fetch, route to the deep-linked question (if any) or the
  // question list. On error we stay on the fetching step (error surface + retry).
  useEffect(() => {
    if (step === "fetching" && fetchStartedRef.current && !loading && hasFetched && !error) {
      if (pendingQuestionId && getQuestion(pendingQuestionId)) {
        setActiveQuestionId(pendingQuestionId);
        setStep("answer");
      } else {
        setStep("questions");
      }
      setPendingQuestionId(null);
    }
  }, [step, loading, hasFetched, error, pendingQuestionId]);

  // Mirror the active view to the URL hash.
  useEffect(() => {
    if (step === "answer" && activeQuestionId) writeAnswerHash(activeQuestionId);
    else if (step === "questions" || step === "setup") writeListHash();
  }, [step, activeQuestionId]);

  // Respond to browser back/forward (and manual hash edits) once data is loaded.
  useEffect(() => {
    const onHashChange = () => {
      if (!hasFetched) return;
      const qid = readQuestionFromHash();
      if (qid && getQuestion(qid)) {
        setActiveQuestionId(qid);
        setStep("answer");
      } else {
        setStep("questions");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [hasFetched]);

  const goToSetup = useCallback(() => {
    fetchStartedRef.current = false;
    setActiveQuestionId(null);
    setStep("setup");
  }, []);

  const handleConnect = useCallback(() => {
    setStep("fetching");
  }, []);

  const repoLabel =
    config.repoOwner && config.repository
      ? `${config.repoOwner}/${config.repository}`
      : config.project
      ? `Project ${config.project}`
      : config.repoOwner || "Your project";

  const handleSelectQuestion = useCallback((id: string) => {
    rememberLastQuestion(id);
    setActiveQuestionId(id);
    setStep("answer");
  }, []);

  const goToQuestions = useCallback(() => setStep("questions"), []);

  const handleRetry = useCallback(() => {
    fetchStartedRef.current = true;
    void fetch();
  }, [fetch]);

  if (step === "setup") {
    return (
      <SetupWizard
        config={config}
        addConfiguration={addConfiguration}
        onConnect={handleConnect}
      />
    );
  }

  if (step === "fetching") {
    return <FetchingStep onRetry={handleRetry} onBack={goToSetup} />;
  }

  if (step === "answer" && activeQuestionId) {
    return (
      <AnswerView
        questionId={activeQuestionId}
        config={config}
        repoLabel={repoLabel}
        onBack={goToQuestions}
        onChangeRepo={goToSetup}
      />
    );
  }

  // step === "questions"
  return (
    <QuestionList
      flags={flags}
      repoLabel={repoLabel}
      onSelect={handleSelectQuestion}
      onChangeRepo={goToSetup}
    />
  );
}
