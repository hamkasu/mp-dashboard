import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  insertLegislativeProposalSchema, 
  insertDebateParticipationSchema, 
  insertParliamentaryQuestionSchema 
} from "@shared/schema";
import type { Mp, InsertLegislativeProposal, InsertDebateParticipation, InsertParliamentaryQuestion } from "@shared/schema";
import { z } from "zod";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const legislativeProposalFormSchema = insertLegislativeProposalSchema.extend({
  dateProposed: z.string().min(1, "Date is required"),
});

const debateParticipationFormSchema = insertDebateParticipationSchema.extend({
  date: z.string().min(1, "Date is required"),
});

const parliamentaryQuestionFormSchema = insertParliamentaryQuestionSchema.extend({
  dateAsked: z.string().min(1, "Date is required"),
});

export function AddActivityDialog({ open, onOpenChange }: AddActivityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("legislation");

  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const proposalForm = useForm<z.infer<typeof legislativeProposalFormSchema>>({
    resolver: zodResolver(legislativeProposalFormSchema),
    defaultValues: {
      mpId: "",
      title: "",
      type: "Bill",
      dateProposed: "",
      status: "Pending",
      description: "",
      hansardReference: "",
      outcome: "",
    },
  });

  const debateForm = useForm<z.infer<typeof debateParticipationFormSchema>>({
    resolver: zodResolver(debateParticipationFormSchema),
    defaultValues: {
      mpId: "",
      topic: "",
      date: "",
      contribution: "",
      hansardReference: "",
      position: "",
    },
  });

  const questionForm = useForm<z.infer<typeof parliamentaryQuestionFormSchema>>({
    resolver: zodResolver(parliamentaryQuestionFormSchema),
    defaultValues: {
      mpId: "",
      questionText: "",
      dateAsked: "",
      ministry: "",
      topic: "",
      answerStatus: "Pending",
      hansardReference: "",
      answerText: "",
    },
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data: InsertLegislativeProposal) => {
      return await apiRequest("POST", "/api/legislative-proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legislative-proposals"] });
      toast({ title: "Success", description: "Legislative proposal added successfully" });
      proposalForm.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add legislative proposal", 
        variant: "destructive" 
      });
    },
  });

  const createDebateMutation = useMutation({
    mutationFn: async (data: InsertDebateParticipation) => {
      return await apiRequest("POST", "/api/debate-participations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debate-participations"] });
      toast({ title: "Success", description: "Debate participation added successfully" });
      debateForm.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add debate participation", 
        variant: "destructive" 
      });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: InsertParliamentaryQuestion) => {
      return await apiRequest("POST", "/api/parliamentary-questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-questions"] });
      toast({ title: "Success", description: "Parliamentary question added successfully" });
      questionForm.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add parliamentary question", 
        variant: "destructive" 
      });
    },
  });

  const onProposalSubmit = (data: z.infer<typeof legislativeProposalFormSchema>) => {
    createProposalMutation.mutate({
      ...data,
      dateProposed: new Date(data.dateProposed),
    });
  };

  const onDebateSubmit = (data: z.infer<typeof debateParticipationFormSchema>) => {
    createDebateMutation.mutate({
      ...data,
      date: new Date(data.date),
    });
  };

  const onQuestionSubmit = (data: z.infer<typeof parliamentaryQuestionFormSchema>) => {
    createQuestionMutation.mutate({
      ...data,
      dateAsked: new Date(data.dateAsked),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Parliamentary Activity</DialogTitle>
          <DialogDescription>
            Record legislative proposals, debate participations, or parliamentary questions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="legislation" data-testid="dialog-tab-legislation">Legislation</TabsTrigger>
            <TabsTrigger value="debates" data-testid="dialog-tab-debates">Debates</TabsTrigger>
            <TabsTrigger value="questions" data-testid="dialog-tab-questions">Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="legislation" className="space-y-4 mt-4">
            <Form {...proposalForm}>
              <form onSubmit={proposalForm.handleSubmit(onProposalSubmit)} className="space-y-4">
                <FormField
                  control={proposalForm.control}
                  name="mpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member of Parliament</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mp">
                            <SelectValue placeholder="Select MP" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mps.map((mp) => (
                            <SelectItem key={mp.id} value={mp.id}>
                              {mp.name} - {mp.constituency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={proposalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input data-testid="input-title" placeholder="Enter bill or proposal title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={proposalForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bill">Bill</SelectItem>
                            <SelectItem value="Amendment">Amendment</SelectItem>
                            <SelectItem value="Motion">Motion</SelectItem>
                            <SelectItem value="Private Member's Bill">Private Member's Bill</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={proposalForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Passed">Passed</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={proposalForm.control}
                  name="dateProposed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Proposed</FormLabel>
                      <FormControl>
                        <Input data-testid="input-date-proposed" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={proposalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-description"
                          placeholder="Enter description of the proposal" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={proposalForm.control}
                  name="hansardReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hansard Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-hansard-ref" placeholder="Enter Hansard reference" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={proposalForm.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-outcome"
                          placeholder="Enter outcome or result" 
                          rows={2}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProposalMutation.isPending}
                    data-testid="button-submit-proposal"
                  >
                    {createProposalMutation.isPending ? "Adding..." : "Add Proposal"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="debates" className="space-y-4 mt-4">
            <Form {...debateForm}>
              <form onSubmit={debateForm.handleSubmit(onDebateSubmit)} className="space-y-4">
                <FormField
                  control={debateForm.control}
                  name="mpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member of Parliament</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mp-debate">
                            <SelectValue placeholder="Select MP" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mps.map((mp) => (
                            <SelectItem key={mp.id} value={mp.id}>
                              {mp.name} - {mp.constituency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debateForm.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debate Topic</FormLabel>
                      <FormControl>
                        <Input data-testid="input-topic" placeholder="Enter debate topic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debateForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input data-testid="input-debate-date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debateForm.control}
                  name="contribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contribution</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-contribution"
                          placeholder="Enter MP's contribution or remarks" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debateForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-position" placeholder="e.g., For, Against, Neutral" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debateForm.control}
                  name="hansardReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hansard Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-hansard-ref-debate" placeholder="Enter Hansard reference" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-debate"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDebateMutation.isPending}
                    data-testid="button-submit-debate"
                  >
                    {createDebateMutation.isPending ? "Adding..." : "Add Debate"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            <Form {...questionForm}>
              <form onSubmit={questionForm.handleSubmit(onQuestionSubmit)} className="space-y-4">
                <FormField
                  control={questionForm.control}
                  name="mpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member of Parliament</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mp-question">
                            <SelectValue placeholder="Select MP" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mps.map((mp) => (
                            <SelectItem key={mp.id} value={mp.id}>
                              {mp.name} - {mp.constituency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={questionForm.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <FormControl>
                        <Input data-testid="input-question-topic" placeholder="Enter question topic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={questionForm.control}
                    name="ministry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ministry</FormLabel>
                        <FormControl>
                          <Input data-testid="input-ministry" placeholder="Enter ministry" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={questionForm.control}
                    name="answerStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Answer Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-answer-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Answered">Answered</SelectItem>
                            <SelectItem value="Deferred">Deferred</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={questionForm.control}
                  name="dateAsked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Asked</FormLabel>
                      <FormControl>
                        <Input data-testid="input-date-asked" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={questionForm.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-question"
                          placeholder="Enter the parliamentary question" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={questionForm.control}
                  name="answerText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-answer"
                          placeholder="Enter the answer if available" 
                          rows={3}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={questionForm.control}
                  name="hansardReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hansard Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-hansard-ref-question" placeholder="Enter Hansard reference" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-question"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createQuestionMutation.isPending}
                    data-testid="button-submit-question"
                  >
                    {createQuestionMutation.isPending ? "Adding..." : "Add Question"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
