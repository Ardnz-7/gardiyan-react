import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('sanity', () => {
  it('renders a div into the document', () => {
    render(<div>hello</div>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
