import csv,glob,sys,json
C={'41.196.241/0001-35','35.726.300/0001-37','63.762.704/0001-11','54.485.055/0001-68','51.675.926/0001-18','49.933.828/0001-91'}
out=[]
for m in ['202608','202606']:
    for f in sorted(glob.glob(f'cda{m}/*.csv')):
        with open(f,encoding='latin1') as fh:
            r=csv.DictReader(fh,delimiter=';')
            for row in r:
                k=row.get('CNPJ_FUNDO_CLASSE') or row.get('CNPJ_FUNDO')
                if k in C:
                    row['_file']=f; out.append(row)
json.dump(out,open('brave_cda.json','w'),ensure_ascii=False,indent=0)
print(len(out))
