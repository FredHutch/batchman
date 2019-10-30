export const exampleScript = `#!/usr/bin/env nextflow


fastq_pair_ch = Channel.fromFilePairs(params.input_folder + '/*{1,2}.fastq.gz', flat:true).take(5)


process fastqc {
    container 'quay.io/biocontainers/fastqc:0.11.8--1'
    echo true
    memory '4 GB'
    input:
    set pair_name, file(fastq1), file(fastq2) from fastq_pair_ch

    output:
    file "fastqc_\${pair_name}_output" into fastqc_ch

    script:
    """
    mkdir fastqc_\${pair_name}_output
    fastqc -o fastqc_\${pair_name}_output $fastq1 $fastq2
    """
}


process multiqc {
   container 'quay.io/biocontainers/multiqc:1.7--py_4'
   publishDir 's3://uwlm-personal/nkrumm/nextflow-publish-dir'
   memory '4 GB'
   input:
   file('*') from fastqc_ch.collect()

   output:
   file "multiqc_report.html"

   script:
   """
   multiqc .
   """
}
`

export const exampleConfig = `\
params.input_folder = 's3://uwlm-ngs-data/targeted/opx/fastqs/2019/190104_HA0570_OncoPlexKAPA327-OPXv5/sample/32725_A04_OPXv5_HA0570/'

workDir = 's3://uwlm-personal/nkrumm/nextflow-work-dir'

executor.disableRemoteBinDir = true

process {
  scratch = "/docker_scratch"
  queue = 'default-queue'
  executor = 'awsbatch'
}

aws {
      region = 'us-west-2'
      batch {
        volumes = '/docker_scratch'
        cliPath = '/home/ec2-user/miniconda/bin/aws'
      }
}
`