import ReactMarkdown from 'react-markdown'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm text-on-surface-variant">
      <ReactMarkdown
        components={{
          h1: (props) => <h1 className="mt-2 text-lg font-semibold text-on-surface" {...props} />,
          h2: (props) => <h2 className="mt-3 text-base font-semibold text-on-surface" {...props} />,
          h3: (props) => (
            <h3
              className="mt-3 text-xs font-semibold tracking-wide text-on-surface uppercase"
              {...props}
            />
          ),
          p: (props) => <p className="leading-relaxed" {...props} />,
          ul: (props) => <ul className="flex list-disc flex-col gap-1.5 ps-5" {...props} />,
          ol: (props) => <ol className="flex list-decimal flex-col gap-1.5 ps-5" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-medium text-on-surface" {...props} />,
          a: (props) => (
            <a className="text-primary underline underline-offset-2" target="_blank" {...props} />
          ),
          code: (props) => (
            <code
              className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-xs"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              className="overflow-x-auto rounded-app-sm bg-surface-container-high p-3 font-mono text-xs leading-relaxed"
              {...props}
            />
          ),
          hr: (props) => <hr className="border-outline-variant" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
