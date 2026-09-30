import React from 'react';

export default function DashboardCard({children, onClick, style, title, ...props}) {
  return <div {...props} role="button" tabIndex={0} title={title}
    style={{...style, cursor:'pointer'}} onClick={onClick}
    onKeyDown={event => {
      if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
        event.preventDefault(); onClick(event);
      }
    }}>{children}</div>;
}
