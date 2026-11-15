/** Fill "{name}" and "{link}" in the WhatsApp share template (Settings). Always includes the link. */
export function fillShareTemplate(template: string, vars: { name: string; link: string }): string {
  const text = template.replaceAll("{name}", vars.name).replaceAll("{link}", vars.link);
  return text.includes(vars.link) ? text : `${text} ${vars.link}`;
}
