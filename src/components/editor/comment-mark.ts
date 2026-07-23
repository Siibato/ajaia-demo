import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (threadId: string) => ReturnType;
      unsetComment: (threadId: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "commentMark",

  inclusive: false,

  excludes: "",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-thread-id"),
        renderHTML: (attrs) => {
          if (!attrs.threadId) return {};
          return { "data-thread-id": attrs.threadId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-thread-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (threadId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { threadId });
        },
      unsetComment:
        (threadId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const markType = state.schema.marks[this.name];
          if (!markType) return false;

          tr.removeMark(0, doc.content.size, markType);

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (
                mark.type === markType &&
                mark.attrs.threadId === threadId
              ) {
                tr.addMark(
                  pos,
                  pos + node.nodeSize,
                  markType.create({ threadId })
                );
              }
            });
          });

          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
