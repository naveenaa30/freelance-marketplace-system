export default function SkillPicker({ skills, selected, onChange }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div style={{ marginBottom: 14 }}>
      {skills.map((s) => (
        <label key={s.id} style={{ display: 'inline-block', marginRight: 16, marginBottom: 6 }}>
          <input
            type="checkbox"
            style={{ width: 'auto', margin: '0 6px 0 0' }}
            checked={selected.includes(s.id)}
            onChange={() => toggle(s.id)}
          />
          {s.name}
        </label>
      ))}
    </div>
  );
}